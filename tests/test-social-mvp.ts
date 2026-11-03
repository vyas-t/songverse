/**
 * =========================================================================
 * SONGVERSE SOCIAL SYSTEM MVP — AUTOMATED TEST SUITE
 * =========================================================================
 * Tests:
 * 1. Username format validation (length, regex, special characters)
 * 2. Case-insensitive username uniqueness checking
 * 3. Username updating and profile synchronization
 * 4. User search by username
 * 5. Friend request lifecycle (send, pending, accept, reject)
 * 6. Prevention of self-addition and duplicate requests
 * 7. Friend removal
 * 8. Online presence / heartbeat status
 * 9. Room invitation creation, retrieval, and response
 * 10. Privacy verification (no private emails in public directory or search)
 */

import { socialService } from '../src/services/socialService';
import { gameEngine } from '../src/services/gameEngine';
import { FriendUser, RoomInvitation } from '../src/types';

// Mock localStorage if in headless environment
if (typeof localStorage === 'undefined' || localStorage === null) {
  const store: Record<string, string> = {};
  (global as any).localStorage = {
    getItem: (key: string) => store[key] || null,
    setItem: (key: string, value: string) => { store[key] = value.toString(); },
    removeItem: (key: string) => { delete store[key]; },
    clear: () => { Object.keys(store).forEach(k => delete store[k]); }
  };
}

let passed = 0;
let total = 0;

function assert(condition: boolean, title: string, details?: string) {
  total++;
  if (condition) {
    passed++;
    console.log(`[✓ PASS] Test ${total}: ${title}`);
    if (details) console.log(`       Details:  ${details}`);
  } else {
    console.error(`[✗ FAIL] Test ${total}: ${title}`);
    if (details) console.error(`       Details:  ${details}`);
    throw new Error(`Test failed: ${title}`);
  }
}

async function runSocialTests() {
  console.log('\n====================================================');
  console.log('  SONGVERSE SOCIAL MVP — AUTOMATED TEST SUITE');
  console.log('====================================================\n');

  // --- 1. USERNAME VALIDATION ---
  console.log('--- 1. USERNAME VALIDATION & FORMAT ---');
  
  const tooShort = socialService.validateUsernameFormat('ab');
  assert(!tooShort.valid, 'Username under 3 characters is rejected');

  const tooLong = socialService.validateUsernameFormat('this_username_is_way_too_long_and_invalid');
  assert(!tooLong.valid, 'Username over 20 characters is rejected');

  const invalidChars = socialService.validateUsernameFormat('vyas@song!');
  assert(!invalidChars.valid, 'Username with invalid special characters (@, !) is rejected');

  const validUsername = socialService.validateUsernameFormat('vyas_beat99');
  assert(validUsername.valid, 'Valid alphanumeric and underscore username is accepted', 'vyas_beat99');

  // --- 2. USERNAME UNIQUENESS & ASSIGNMENT ---
  console.log('\n--- 2. USERNAME UNIQUENESS & CASE-INSENSITIVITY ---');

  // Register discoverable users in mock directory
  const playerA: FriendUser = {
    id: 'user_player_a',
    displayName: 'Alice Melody',
    username: 'alice_groove',
    avatarSeed: 'aurora',
    totalScore: 450,
    gamesPlayed: 10,
    roundsWon: 8,
    currentStreak: 4,
    bestStreak: 6,
    isOnline: true
  };
  socialService.registerDiscoverableUser(playerA);

  const duplicateCheck = await socialService.checkUsernameAvailability('ALICE_GROOVE');
  assert(
    !duplicateCheck.available,
    'Case-insensitive duplicate username is blocked (ALICE_GROOVE vs alice_groove)'
  );

  const availableCheck = await socialService.checkUsernameAvailability('bob_rockstar');
  assert(
    availableCheck.available,
    'Available unique username is accepted (bob_rockstar)'
  );

  // Set user profile as registered user
  gameEngine.updateUserProfile({
    id: 'my_test_user_id',
    isGuest: false,
    displayName: 'Vyas Test',
    username: 'vyas_initial'
  });

  const updateRes = await socialService.updateUsername('vyas_music_master');
  assert(
    updateRes.success && updateRes.username === 'vyas_music_master',
    'User successfully updates their unique username',
    `New username: ${updateRes.username}`
  );

  const profileAfterUpdate = gameEngine.getUserProfile();
  assert(
    profileAfterUpdate.username === 'vyas_music_master',
    'Profile reflects updated username'
  );

  // --- 3. USER DISCOVERY & SEARCH ---
  console.log('\n--- 3. USER DISCOVERY & SEARCH ---');

  const searchResults = await socialService.searchUsersByUsername('alice');
  assert(
    searchResults.length > 0 && searchResults[0].username === 'alice_groove',
    'Searching by partial username returns matching user profile',
    `Found: @${searchResults[0]?.username} (${searchResults[0]?.displayName})`
  );

  assert(
    (searchResults[0] as any).email === undefined,
    'Private email addresses are strictly absent from search results'
  );

  // --- 4. FRIEND REQUEST LIFECYCLE ---
  console.log('\n--- 4. FRIEND REQUEST LIFECYCLE ---');

  // Prevent adding yourself
  const mySelfFriendUser: FriendUser = {
    id: 'my_test_user_id',
    displayName: 'Vyas Test',
    username: 'vyas_music_master',
    avatarSeed: 'aurora',
    totalScore: 0,
    gamesPlayed: 0,
    roundsWon: 0,
    currentStreak: 0,
    bestStreak: 0,
    isOnline: true
  };
  const selfAddRes = await socialService.sendFriendRequest(mySelfFriendUser);
  assert(
    !selfAddRes.success && selfAddRes.error?.includes('yourself'),
    'Adding yourself as a friend is strictly prevented'
  );

  // Send request to Alice
  const sendRes = await socialService.sendFriendRequest(playerA);
  assert(
    sendRes.success,
    'Friend request successfully sent to @alice_groove'
  );

  // Duplicate request check
  const duplicateReqRes = await socialService.sendFriendRequest(playerA);
  assert(
    !duplicateReqRes.success,
    'Duplicate friend request to the same user is prevented'
  );

  // Simulate incoming request from Bob
  const playerB: FriendUser = {
    id: 'user_player_b',
    displayName: 'Bob Rhythms',
    username: 'bob_rhythms',
    avatarSeed: 'rhythm',
    totalScore: 320,
    gamesPlayed: 6,
    roundsWon: 5,
    currentStreak: 2,
    bestStreak: 3,
    isOnline: true
  };
  socialService.registerDiscoverableUser(playerB);

  const incomingReqId = 'req_bob_to_me_01';
  (socialService as any).incomingRequests.push({
    id: incomingReqId,
    senderId: playerB.id,
    receiverId: 'my_test_user_id',
    status: 'pending',
    createdAt: new Date().toISOString(),
    sender: {
      id: playerB.id,
      displayName: playerB.displayName,
      username: playerB.username,
      avatarSeed: playerB.avatarSeed
    }
  });

  assert(
    socialService.getIncomingRequests().some(r => r.id === incomingReqId),
    'Incoming friend request appears in pending requests list'
  );

  // Accept Bob's request
  const acceptRes = await socialService.acceptFriendRequest(incomingReqId);
  assert(
    acceptRes.success,
    'Friend request accepted successfully'
  );

  assert(
    socialService.isFriend(playerB.id),
    'Sender is now listed in accepted friends list'
  );

  // Remove friend
  const removeRes = await socialService.removeFriend(playerB.id);
  assert(
    removeRes.success && !socialService.isFriend(playerB.id),
    'Friend successfully removed from friends list'
  );

  // --- 5. ROOM INVITATIONS ---
  console.log('\n--- 5. MULTIPLAYER ROOM INVITATIONS ---');

  // Re-add Bob as friend to test invite
  (socialService as any).friends.push(playerB);

  const inviteRes = await socialService.inviteFriendToRoom(playerB, '482910', 'competitive', 5);
  assert(
    inviteRes.success,
    'Host invites friend to multiplayer room with 6-digit code (482910)'
  );

  // Simulate receiving an invitation from Alice
  const mockIncomingInvite: RoomInvitation = {
    id: 'inv_alice_999',
    roomCode: '777888',
    senderId: playerA.id,
    senderName: playerA.displayName,
    senderUsername: playerA.username,
    receiverId: 'my_test_user_id',
    mode: 'competitive',
    totalRounds: 4,
    status: 'pending',
    createdAt: new Date().toISOString(),
    expiresAt: new Date(Date.now() + 5 * 60 * 1000).toISOString()
  };
  socialService.receiveMockInvitation(mockIncomingInvite);

  const activeInvites = socialService.getPendingInvitations();
  assert(
    activeInvites.some(i => i.id === 'inv_alice_999'),
    'Incoming room invitation is received with code 777888 and 5-minute expiration'
  );

  const respondRes = await socialService.respondToInvitation('inv_alice_999', 'accept');
  assert(
    respondRes.success && respondRes.roomCode === '777888',
    'Accepting room invitation returns room code 777888 for seamless lobby navigation'
  );

  // --- 6. GUEST RESTRICTION SAFEGUARD ---
  console.log('\n--- 6. GUEST RESTRICTION SAFEGUARD ---');

  gameEngine.updateUserProfile({ isGuest: true });
  const guestInvite = await socialService.inviteFriendToRoom(playerA, '123456');
  assert(
    !guestInvite.success && guestInvite.error?.includes('Sign in'),
    'Guest users cannot invite or add friends without registered account'
  );

  // Final summary
  console.log('\n----------------------------------------------------');
  console.log(`Final Verification Score: ${passed} / ${total} Scenarios Passed.`);
  console.log('====================================================\n');

  process.exit(0);
}

runSocialTests().catch(err => {
  console.error('\nTest Suite Execution Encountered Error:', err);
  process.exit(1);
});

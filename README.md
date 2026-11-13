# 🎵 SONGVERSE

### Hear the music. Feel the moment. Guess the song.

**SONGVERSE** is a music discovery and song-guessing platform designed to turn listening into an interactive experience. Challenge yourself, test your music knowledge, compete with friends, and explore the world of music through an engaging web experience.

---

## ✨ About the Project

SONGVERSE brings music and interactive gameplay together in one platform.

The idea is simple: listen to a song preview, identify the track, and challenge yourself to recognise music across different rounds and difficulty levels.

Whether you're playing independently or competing with friends, SONGVERSE aims to make music discovery more exciting, social, and engaging.

## 🚀 Vision

To create an accessible, interactive music platform where people can:

- Discover music through interactive experiences.
- Challenge their music recognition skills.
- Play and compete with friends.
- Explore music across different genres and languages.
- Enjoy a smooth experience across devices.

## 🎮 Core Experience

SONGVERSE is built around an interactive music-guessing experience.

### Music Guessing

- Listen to song previews.
- Identify tracks based on audio clues.
- Test your music recognition skills.
- Progress through different challenge levels.

### Multiplayer Experience

- Designed for competitive music sessions.
- Room-based multiplayer experience.
- Invite friends and participate together.
- A social approach to music guessing.

### Music Discovery

- Explore music through integrated catalogue and search functionality.
- Discover tracks using supported music data providers.
- Experience music beyond traditional playlists.

### User Experience

- Responsive interface for different screen sizes.
- Modern, interactive visual design.
- Theme preferences, including dark and light modes.
- Guest access and optional account-based experiences where supported.

*Feature availability may depend on the current deployment, backend configuration, and supported music providers.*

---

## 🛠️ Technology Stack

SONGVERSE uses a modern web development stack.

| Technology       | Purpose                              |
| ---------------- | ------------------------------------ |
| React            | Frontend user interface              |
| TypeScript       | Type-safe application development    |
| Vite             | Development and build tooling        |
| Tailwind CSS     | Styling and responsive layouts       |
| Supabase         | Backend services and database        |
| Node.js          | Server-side runtime                  |
| Express.js       | API and server functionality         |
| Cloudflare Pages | Web hosting and deployment           |
| PeerJS / WebRTC  | Real-time communication capabilities |

---

## 🏗️ Architecture Overview

SONGVERSE follows a frontend-and-backend architecture.

```text
                  SONGVERSE
                      |
          +-----------+-----------+
          |                       |
      Frontend                 Backend
          |                       |
    React + TypeScript       Node.js + Express
          |                       |
       Vite Build             API Routes
          |                       |
          +-----------+-----------+
                      |
              External Services
                      |
          +-----------+-----------+
          |                       |
       Supabase              Music Providers
          |
    Database & Auth
                      |
              Cloudflare Pages
                 Deployment
```

The deployed application may use Cloudflare Pages Functions for supported API endpoints. Backend functionality that depends on Express must be deployed through a compatible server environment or implemented through an appropriate Cloudflare integration.

---

## 💻 Getting Started

Follow these steps to run the project locally.

### Prerequisites

Make sure you have:

- Node.js installed.
- npm installed.
- Git installed.
- A code editor such as Visual Studio Code.

### 1. Clone the Repository

```bash
git clone https://github.com/vyas-t/songverse.git
```

### 2. Navigate to the Project

```bash
cd songverse
```

### 3. Install Dependencies

```bash
npm install
```

### 4. Configure Environment Variables

Create a `.env` file in the project root.

Add the environment variables required by your local configuration.

Use the project's `.env.example` or existing configuration documentation as the source of truth for variable names.

**Important:** Never upload your `.env` file, API keys, service-role keys, or private credentials to GitHub.

### 5. Start the Development Server

```bash
npm run dev
```

Open the local URL displayed in your terminal.

*Check the project's `package.json` for the exact available scripts.*

---

## ☁️ Deployment

SONGVERSE has been deployed using **Cloudflare Pages**.

The deployment workflow can be configured through GitHub integration.

General deployment process:

1. Push the project to GitHub.
2. Open the Cloudflare Dashboard.
3. Navigate to Workers & Pages.
4. Create or select the SONGVERSE Pages project.
5. Connect the GitHub repository.
6. Configure the production branch and build settings.
7. Add the required environment variables.
8. Deploy the application.

### Important Deployment Notes

- Frontend changes require a successful deployment.
- Cloudflare Pages Functions must be configured and deployed separately as part of the Pages project.
- Express-only routes require a compatible backend deployment.
- Supabase database migrations must be applied separately when required.
- Production credentials must be configured securely.

---

## 🔐 Security

Security and user privacy are important parts of SONGVERSE.

Development priorities include:

- Secure authentication through Supabase Auth.
- Server-side handling of privileged operations.
- Protected database access through Row Level Security.
- Avoiding hardcoded credentials.
- Keeping sensitive environment variables out of source control.
- Validating user actions on the server.

Security configurations should be reviewed and tested before production use.

---

## 🧪 Testing and Quality

The project uses development and testing workflows to help maintain application reliability.

Recommended checks before contributing or deploying:

```bash
npm install
npm run build
```

Run the test and type-check commands defined in `package.json` before submitting changes.

---

## 📁 Project Structure

The repository contains the frontend application, backend functionality, configuration, and deployment-related resources.

A simplified conceptual structure:

```text
songverse/
│
├── public/
│
├── src/
│   ├── components/
│   ├── pages/
│   ├── hooks/
│   ├── services/
│   └── ...
│
├── functions/
│
├── server.ts
├── package.json
├── tsconfig.json
├── vite.config.ts
├── README.md
└── .gitignore
```

*The actual repository structure may contain additional folders and files.*

---

## 🗺️ Roadmap

SONGVERSE is an evolving project. Future development priorities include:

- [ ] Improve multiplayer reliability.
- [ ] Expand music catalogue and discovery.
- [ ] Improve leaderboard reliability.
- [ ] Strengthen backend infrastructure.
- [ ] Improve authentication and account management.
- [ ] Optimise performance and loading times.
- [ ] Improve cross-device compatibility.
- [ ] Expand social and competitive experiences.

---

## 🤝 Contributing

Contributions, suggestions, and feedback are welcome.

If you would like to contribute:

1. Fork the repository.
2. Create a feature branch.
3. Make your changes.
4. Test your changes.
5. Submit a pull request describing your contribution.

Please avoid committing secrets, private credentials, or unrelated generated files.

---

## 👨‍💻 Developer

**Created by T Vyas**

GitHub: [@vyas-t](https://github.com/vyas-t)

Project Repository: [github.com/vyas-t/songverse](https://github.com/vyas-t/songverse)

---

## 📜 License

Check the repository for its current license.

If no license has been added, the project remains subject to the default copyright rules. Please do not assume that it is open-source licensed.

---

## 🎧 Experience SONGVERSE

**Listen. Guess. Compete. Discover.**

Welcome to SONGVERSE — where every song is a new challenge.


# 🎙️ Voice AI Translator App

A full-stack AI-powered voice translator built using **React Native (Expo)** and **Node.js backend with OpenAI**.

---

## 🚀 Features

* 🎤 Voice input recording (Android + iOS)
* 🌍 Multi-language translation (Hindi, Marathi, Telugu, etc.)
* 🔊 AI-generated speech output (Male / Female voices)
* 🇮🇳 Indian accent simulation
* 🎧 Auto-play audio with player UI
* 📱 Clean mobile UI with tab navigation
* ⚡ Real-time processing using OpenAI APIs

---

## 🏗️ Tech Stack

### Frontend

* React Native (Expo)
* NativeWind (Tailwind CSS)
* Expo AV (Audio recording & playback)

### Backend

* Node.js + Express
* OpenAI API (Transcription + Translation + TTS)
* Multer (file upload)
* FFmpeg (audio conversion)

---


## 📂 Project Structure

```
project-root/
│
├── frontend/     # Expo app
├── backend/      # Node.js server
└── README.md
```

---

## 🔁 How It Works

1. 🎙️ User records voice
2. 📡 Audio sent to backend
3. 🔄 FFmpeg converts audio to WAV
4. 🧠 OpenAI transcribes speech → text
5. 🌍 Text translated to selected language
6. 🔊 AI generates speech output
7. 📱 App plays audio automatically


## ⚙️ Setup Instructions

### 1️⃣ Clone the Repository

```bash
git remote add origin https://github.com/himanshuraj-demon/Lan-Vector.git
```

---

### 2️⃣ Install Dependencies

#### 📱 Frontend

```bash
cd frontend
npm install
```

#### 🌐 Backend

```bash
cd backend
npm install
```

---

## 🔐 Environment Variables

Create a `.env` file in both **frontend** and **backend** folders.

### Example:

#### frontend/.env

```
EXPO_PUBLIC_API_URLL=http://localhost:5000
```

#### backend/.env

```
PORT=5000
API_KEY=your_secret_key
```

---

## ▶️ Running the Project

### 🚀 Start Backend

```bash
cd backend
npm run start
```

---

### 📱 Start Frontend (Expo)

```bash
cd frontend
npx expo start
```

---

## 📦 Features

* 🌍 API-based communication between frontend & backend
* 🔐 Secure environment configuration
* ⚡ Fast development with Expo
* 🧩 Modular folder structure

---

## 🛠️ Tech Stack

* **Frontend**: React Native (Expo)
* **Backend**: Node.js, Express.js

---

## 📌 Notes

* Make sure backend is running before starting frontend
* Update `API_URL` in frontend `.env` if needed
* `.env` files are ignored using `.gitignore`

---

## 👨‍💻 Author

Developed by **Himanshu Raj**

---

## ⭐ Support

If you like this project, give it a ⭐ on GitHub!

---

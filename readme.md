Readme.md editor
(https://pandao.github.io/editor.md/en.html)

## Gym Tracker 🏋️‍♂️

Gym Tracker is a full-stack web application designed to help users track their workout routines, set fitness goals, and monitor their progress over time. Built with React, Chakra UI, Firebase, and Node.js, this application provides a seamless user experience for fitness enthusiasts.

---

### Features ✨

**User Authentication**: Sign up, log in, and manage your profile using Firebase Authentication.

**Workout Entries**: Create, update, and delete workout entries.

**Pagination**: Easily navigate through workout entries with pagination.

**Profile Management**: Update your profile information, including name, bio, gym name, and fitness goals.

**Responsive Design**: Built with Chakra UI for a clean and responsive user interface.

**Backend API**: A robust backend built with Node.js and Express to handle data storage and retrieval.

---

### Technologies Used 🛠️

##### Frontend

**React**: A JavaScript library for building user interfaces.

**Chakra UI**: A simple and modular component library for React.

**Firebase Authentication**: For user authentication and token management.

**React Router**: For client-side routing.

##### Backend

**Node.js**: A JavaScript runtime for building scalable server-side applications.

**Express**: A web framework for Node.js.

**MongoDB**: A NoSQL database for storing workout entries and user profiles.

**Firebase Admin SDK**: For verifying Firebase tokens and managing user authentication.

##### Deployment

**Vercel**: For deploying the frontend.

**Vercel**: For deploying the backend API.

## Getting Started 🚀

##### Prerequisites

- Node.js (v16 or higher)

- npm or yarn

- Firebase project with Authentication enabled

- MongoDB database

##### Installation

1. Clone the repository

   ```bash
   git clone https://github.com/caesarc6/gym-track-frontend.git
   cd gym-tracker
   ```

2. Install dependencies:

- For the frontend:

  ```bash
  cd frontend
  npm install
  ```

- For the backend:

  ```bash
  cd backend
  npm install
  ```

3. Set up environment variables:

Create a .env file in the server directory and add the following:

env
`bash
	MONGO_URI=your_mongodb_connection_string
	FIREBASE_PROJECT_ID=your_firebase_project_id
	FIREBASE_PRIVATE_KEY=your_firebase_private_key
	FIREBASE_CLIENT_EMAIL=your_firebase_client_email
	`

4. Create a .env file in the client directory and add the following:

env
`bash
	REACT_APP_FIREBASE_API_KEY=your_firebase_api_key
	REACT_APP_FIREBASE_AUTH_DOMAIN=your_firebase_auth_domain
	REACT_APP_FIREBASE_PROJECT_ID=your_firebase_project_id
	REACT_APP_FIREBASE_STORAGE_BUCKET=your_firebase_storage_bucket
	REACT_APP_FIREBASE_MESSAGING_SENDER_ID=your_firebase_messaging_sender_id
	REACT_APP_FIREBASE_APP_ID=your_firebase_app_id 4. Run the application:
	`
Start the backend server:

```bash
cd server
npm start
```

- Start the frontend development server:

```bash
cd frontend
npm run dev
```

Access the application:
Open your browser and navigate to http://localhost:3000.

##### Project Structure 📂

Frontend

    frontend/
    ├── public/ # Static assets
    ├── src/
    │ ├── components/ # Reusable components
    │ ├── pages/ # Application pages
    │ ├── store/ # Zustand store for state management
    │ ├── App.js # Main application component
    │ └── index.js # Entry point

Backend

    backend/
    ├── controllers/ # Route handlers
    ├── models/ # MongoDB models
    ├── routes/ # API routes
    ├── utils/ # Utility functions
    ├── app.js # Express application setup
    └── server.js # Server entry point

##### API Endpoints 📡

User Authentication
POST /api/signup: Register a new user.

POST /api/login: Log in an existing user.

GET /api/protected: Protected route for authenticated users.

Workout Entries
GET /api/posts/:uid: Fetch workout entries for a user (supports pagination).

POST /api/posts: Create a new workout entry.

PUT /api/posts/:id: Update a workout entry.

DELETE /api/posts/:id: Delete a workout entry.

User Profile
GET /api/getUserProfile/:uid: Fetch user profile data.

POST /api/updateUserProfile: Update user profile information.

Screenshots 📸
Home Page
Home Page

Profile Page
Profile Page

Workout Entries
Workout Entries

Contributing 🤝
Contributions are welcome! If you'd like to contribute, please follow these steps:

Fork the repository.

Create a new branch (git checkout -b feature/YourFeatureName).

Commit your changes (git commit -m 'Add some feature').

Push to the branch (git push origin feature/YourFeatureName).

Open a pull request.

License 📄
This project is licensed under the MIT License. See the LICENSE file for details.

Acknowledgments 🙏
Chakra UI: For providing an amazing component library.

Firebase: For simplifying user authentication.

React Community: For the endless resources and support.

Contact 📧
If you have any questions or feedback, feel free to reach out:

Your Name: your-email@example.com

GitHub: your-username

LinkedIn: Your LinkedIn Profile

Happy Tracking! 💪

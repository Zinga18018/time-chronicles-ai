# 🕰️ Echoes of Time

![Echoes of Time](https://raw.githubusercontent.com/Zinga18018/time-chronicles-ai/main/Screenshots/{17E401E6-5124-4C43-8130-DD1C8EB9ADD7}.png)

An immersive AI-powered historical storytelling web application that transports users through different eras with multimodal narratives, interactive features, and personalized experiences.

## ✨ Key Features

### 🤖 AI-Powered Historical Storytelling
- **Multimodal Narratives**: Generate rich stories combining text, character descriptions, and immersive details
- **Era Selection**: Choose from various historical periods (Ancient Egypt, Medieval Europe, Renaissance, Industrial Revolution, etc.)
- **Dynamic Content**: Each story is uniquely generated using advanced AI models
- **Character Development**: Meet historical figures and fictional characters with detailed backstories

### 👤 User Experience & Authentication
- **Secure Registration & Login**: Complete user authentication system with password hashing
- **Guest Mode**: Explore stories without creating an account
- **User Profiles**: Personalized dashboards with story history and achievements
- **Session Management**: Secure login sessions with proper logout functionality

### 📚 Interactive Features
- **Story Collection**: Save and organize your favorite generated stories
- **Bookmarking System**: Mark stories for later reading
- **Rating & Reviews**: Rate stories and leave comments for community engagement
- **Achievement System**: Unlock badges for story exploration, collection milestones, and community participation
- **Search & Filter**: Find stories by era, rating, or personal collections

## 📸 Screenshots

### Main Interface
![Main Interface](https://raw.githubusercontent.com/Zinga18018/time-chronicles-ai/main/Screenshots/{17E401E6-5124-4C43-8130-DD1C8EB9ADD7}.png)
*Beautiful animated background with era selection and intuitive navigation*

### Story Generation
![Story Generation](https://raw.githubusercontent.com/Zinga18018/time-chronicles-ai/main/Screenshots/{2966F5C3-98A3-4D45-9976-585BF13A1290}.png)
*Immersive story display with typewriter effects and rich formatting*

### User Authentication
![User Authentication](https://raw.githubusercontent.com/Zinga18018/time-chronicles-ai/main/Screenshots/{3D6AB433-6C57-4842-BCDB-E3C2C1B9849B}.png)
*Clean and secure login/registration interface*

### User Profile
![User Profile](https://raw.githubusercontent.com/Zinga18018/time-chronicles-ai/main/Screenshots/{639D576E-5B2B-4785-8D79-A6F3EEAFC849}.png)
*Comprehensive user dashboard with statistics and achievements*

### Story Collection
![Story Collection](https://raw.githubusercontent.com/Zinga18018/time-chronicles-ai/main/Screenshots/{9D86D3F3-6ED3-415A-B829-5C6FB718F3E9}.png)
*Organized story library with filtering and search capabilities*

## 🎨 Enhanced Features

### Design & User Experience
- **Animated Particle Background**: Dynamic visual effects that respond to user interaction
- **Responsive Design**: Optimized for desktop, tablet, and mobile devices
- **Typewriter Effect**: Immersive text animation for story presentation
- **Smooth Transitions**: Elegant page transitions and hover effects
- **Dark Theme**: Eye-friendly design with carefully chosen color palette

### Technical Excellence
- **RESTful API**: Well-structured endpoints for all application features
- **Database Optimization**: Efficient data storage and retrieval
- **Security Best Practices**: Password hashing, session management, and input validation
- **Modular Architecture**: Clean separation of concerns with blueprints
- **Error Handling**: Comprehensive error management and user feedback

## 🛠️ Technology Stack

### Backend Technologies
- **Flask**: Lightweight and flexible Python web framework
- **SQLAlchemy**: Powerful ORM for database operations
- **Flask-Login**: User session management and authentication
- **Flask-Migrate**: Database migration management
- **Werkzeug**: Password hashing and security utilities

### Frontend Technologies
- **Vanilla JavaScript**: Clean, dependency-free frontend logic
- **Local Storage**: Client-side data persistence
- **Modular Architecture**: Organized code structure with separate concerns

### Database Schema
- **Users**: Authentication, profiles, and user preferences
- **Stories**: Generated content with metadata and relationships
- **Characters**: Rich character data linked to stories
- **Bookmarks**: User-story relationships for saved content
- **Achievements**: Gamification system with progress tracking
- **Ratings & Comments**: Community engagement features

### Design System
- **Typography**: Elegant font combinations (Playfair Display, Source Sans Pro)
- **Color Palette**: Carefully curated dark theme with gold accents
- **Responsive Grid**: Flexible layout system for all screen sizes
- **Micro-interactions**: Subtle animations and feedback mechanisms

## 🚀 Installation & Setup

### Prerequisites
- Python 3.8 or higher
- Google Gemini API key
- Git for version control

### Step-by-Step Installation

1. **Clone the Repository**
   ```bash
   git clone https://github.com/Zinga18018/time-chronicles-ai.git
   cd time-chronicles-ai
   ```

2. **Create Virtual Environment**
   ```bash
   python -m venv venv
   
   # Windows
   venv\Scripts\activate
   
   # macOS/Linux
   source venv/bin/activate
   ```

3. **Install Dependencies**
   ```bash
   pip install -r requirements.txt
   ```

4. **Set Environment Variables**
   ```bash
   # Windows
   set GOOGLE_API_KEY=your_gemini_api_key_here
   
   # macOS/Linux
   export GOOGLE_API_KEY=your_gemini_api_key_here
   ```

5. **Initialize Database**
   ```bash
   python app.py
   ```

### Key Dependencies
- **Flask** (2.3.3): Core web framework
- **Flask-SQLAlchemy** (3.0.5): Database ORM
- **Flask-Login** (0.6.3): User authentication
- **Flask-Migrate** (4.0.5): Database migrations
- **google-generativeai** (0.3.2): AI story generation
- **Werkzeug** (2.3.7): Security utilities

### Quick Start
After installation, simply run:
```bash
python app.py
```
Then visit `http://localhost:5000` in your browser.

## 📖 Usage Guide

### Getting Started
1. **Guest Mode**: Start exploring immediately without registration
2. **Create Account**: Register for full features including saving stories
3. **User Dashboard**: Access your profile, saved stories, and achievements

### Generating Stories
1. **Choose Era**: Select from available historical periods
2. **Generate Content**: Click to create your unique story
3. **Immersive Experience**: Enjoy typewriter-style text animation
4. **Explore Results**: Read generated story with character details

### Managing Your Collection
1. **Saving Stories**: Bookmark interesting narratives for later
2. **Rating System**: Rate stories from 1-5 stars
3. **Comments**: Share thoughts and engage with content
4. **Organization**: Filter and search through your collection

### Achievement System
- **Story Explorer**: Generate stories across different eras
- **Collector**: Save multiple stories to your library
- **Historian**: Achieve high engagement with historical content
- **Community Member**: Participate through ratings and comments

### Customization Options
- **Typewriter Speed**: Adjust text animation speed
- **Audio Settings**: Control sound effects and notifications
- **Theme Options**: Customize visual preferences
- **Profile Management**: Update personal information and preferences

## 🔌 API Endpoints

### Core Story Generation
```http
POST /api/generate_story
Content-Type: application/json

{
  "era": "ancient_egypt",
  "user_id": 123 // optional
}
```

### User Authentication
```http
POST /auth/register
POST /auth/login
POST /auth/logout
GET /auth/profile
```

### Story Management
```http
GET /api/stories              # List all stories with pagination
GET /api/stories/<id>         # Get specific story details
POST /api/stories/<id>/rate   # Rate a story
POST /api/stories/<id>/bookmark # Bookmark/unbookmark story
GET /api/user/stories         # Get user's saved stories
```

### Analytics & Insights
```http
GET /api/user/achievements    # Get user achievements
GET /api/user/stats          # Get user statistics
GET /api/stories/popular     # Get trending stories
```

## 📁 Project Structure

```
time-chronicles-ai/
├── app.py                 # Main Flask application
├── models.py             # Database models and schema
├── auth.py               # Authentication routes and logic
├── api.py                # API endpoints and business logic
├── requirements.txt      # Python dependencies
├── run_app.bat          # Windows startup script
├── LICENSE              # MIT License
├── README.md            # Project documentation
├── static/              # Frontend assets
│   ├── style.css        # Main stylesheet
│   ├── script.js        # Core JavaScript functionality
│   └── profile.js       # User profile management
├── templates/           # HTML templates
│   ├── index.html       # Main application interface
│   └── auth/            # Authentication templates
│       ├── login.html   # Login form
│       ├── register.html # Registration form
│       └── profile.html # User profile page
├── Screenshots/         # Application screenshots
└── instance/           # Database and instance files
    └── time_chronicles.db # SQLite database
```

## 🤝 Contributing

We welcome contributions! Please follow these steps:

1. **Fork the Repository**
2. **Create Feature Branch**: `git checkout -b feature/amazing-feature`
3. **Commit Changes**: `git commit -m 'Add amazing feature'`
4. **Push to Branch**: `git push origin feature/amazing-feature`
5. **Open Pull Request**

### Development Guidelines
- Follow PEP 8 style guide for Python code
- Add comments for complex logic
- Test new features thoroughly
- Update documentation as needed

## 📄 License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

## 🙏 Acknowledgments

- **Google Gemini AI** for powerful story generation capabilities
- **Flask Community** for excellent documentation and support
- **Historical Research** from various academic sources
- **Open Source Contributors** who make projects like this possible

---

**Built with ❤️ for history enthusiasts and storytelling lovers**

*Experience the past like never before with AI-powered historical narratives*
from flask import Flask, render_template, request, jsonify
from flask_login import LoginManager, login_required, current_user
from flask_migrate import Migrate
import google.generativeai as genai
import os
import base64
import io
from PIL import Image
import requests
import json
from datetime import datetime
import random

# Import our modules
from models import db, User, Story, Character, Achievement, UserAchievement, HistoricalEvent
from auth import auth
from api import api

# Configure API Key
genai.configure(api_key='AIzaSyAuEJ3qq-qMfK-LFnx0bWfWtc6iYH9mymI')

# Create Flask application
app = Flask(__name__)
app.config['SECRET_KEY'] = 'your-secret-key-change-in-production'
app.config['SQLALCHEMY_DATABASE_URI'] = 'sqlite:///time_chronicles.db'
app.config['SQLALCHEMY_TRACK_MODIFICATIONS'] = False

# Initialize extensions
db.init_app(app)
migrate = Migrate(app, db)

# Initialize Flask-Login
login_manager = LoginManager()
login_manager.init_app(app)
login_manager.login_view = 'auth.login'
login_manager.login_message = 'Please log in to access this page.'

@login_manager.user_loader
def load_user(user_id):
    return User.query.get(int(user_id))

# Register blueprints
app.register_blueprint(auth)
app.register_blueprint(api)

# Create tables
with app.app_context():
    db.create_all()
    
    # Initialize achievements if they don't exist
    if Achievement.query.count() == 0:
        achievements = [
            Achievement(name='First Story', description='Write your first diary entry', icon='📖', condition_type='story_count', condition_value=1),
            Achievement(name='Time Traveler', description='Explore 3 different eras', icon='⏰', condition_type='era_count', condition_value=3),
            Achievement(name='Prolific Writer', description='Write 10 diary entries', icon='✍️', condition_type='story_count', condition_value=10),
            Achievement(name='History Buff', description='Write 25 diary entries', icon='🎓', condition_type='story_count', condition_value=25),
            Achievement(name='Social Butterfly', description='Receive 10 ratings on your stories', icon='⭐', condition_type='rating_count', condition_value=10),
            Achievement(name='Bookworm', description='Bookmark 20 stories', icon='🔖', condition_type='bookmark_count', condition_value=20),
            Achievement(name='Renaissance Soul', description='Write stories in 5 different eras', icon='🎨', condition_type='era_count', condition_value=5),
            Achievement(name='Master Chronicler', description='Write 50 diary entries', icon='👑', condition_type='story_count', condition_value=50)
        ]
        
        for achievement in achievements:
            db.session.add(achievement)
        
        db.session.commit()

# Achievement checking function
def check_and_award_achievements(user_id):
    """Check and award achievements for a user"""
    try:
        user = User.query.get(user_id)
        if not user:
            return
        
        # Get user statistics
        story_count = Story.query.filter_by(user_id=user_id).count()
        era_count = db.session.query(Story.era).filter_by(user_id=user_id).distinct().count()
        
        # Get achievements user doesn't have yet
        existing_achievements = db.session.query(UserAchievement.achievement_id).filter_by(user_id=user_id).subquery()
        available_achievements = Achievement.query.filter(~Achievement.id.in_(existing_achievements)).all()
        
        for achievement in available_achievements:
            earned = False
            
            if achievement.condition_type == 'story_count' and story_count >= achievement.condition_value:
                earned = True
            elif achievement.condition_type == 'era_count' and era_count >= achievement.condition_value:
                earned = True
            
            if earned:
                user_achievement = UserAchievement(user_id=user_id, achievement_id=achievement.id)
                db.session.add(user_achievement)
        
        db.session.commit()
    except Exception as e:
        print(f"Error checking achievements: {e}")
        db.session.rollback()

# Main route
@app.route('/')
def index():
    return render_template('index.html')

# API route for generating diary entries with images
@app.route('/generate_diary', methods=['POST'])
def generate_diary():
    try:
        # Get the era from the request
        data = request.get_json()
        era = data.get('era') or data.get('event')  # Support both 'era' and 'event' for compatibility
        save_story = data.get('save_story', False)
        is_public = data.get('is_public', True)
        
        if not era:
            return jsonify({'error': 'No era provided'}), 400
        
        # Enhanced personas with more detail
        personas = {
            'The Roaring Twenties': {
                'character': 'a young flapper named Ruby in Chicago, dancing through the jazz age with dreams of freedom and rebellion',
                'setting': 'smoky jazz club with art deco styling, people dancing the Charleston, 1920s fashion',
                'mood': 'energetic and rebellious'
            },
            'The Great Depression': {
                'character': 'a factory worker named Thomas in Detroit, struggling to keep hope alive while watching the world change',
                'setting': 'industrial Detroit during the Great Depression, bread lines, closed factories, somber atmosphere',
                'mood': 'melancholic but hopeful'
            },
            'The Space Race': {
                'character': 'an engineer named Sarah at NASA in Houston, working tirelessly on humanity\'s greatest adventure to reach the stars',
                'setting': 'NASA mission control room in the 1960s, rockets, space equipment, determined scientists',
                'mood': 'ambitious and awe-inspiring'
            },
            'The 1960s Counter-culture': {
                'character': 'a college student named Peace in San Francisco, questioning everything and believing in the power of love and change',
                'setting': 'Haight-Ashbury district, colorful hippie culture, peace signs, flower power, protest signs',
                'mood': 'idealistic and revolutionary'
            },
            'The Dawn of the Internet': {
                'character': 'a computer programmer named Alex in Silicon Valley, witnessing the birth of a connected world',
                'setting': 'early computer lab in the 1990s, bulky monitors, cables, early internet infrastructure',
                'mood': 'excited and visionary'
            },
            'World War II Home Front': {
                'character': 'a factory worker named Betty in a munitions plant, doing your part for the war effort while missing loved ones overseas',
                'setting': 'WWII munitions factory, women workers, propaganda posters, wartime atmosphere',
                'mood': 'patriotic but worried'
            },
            'The Renaissance': {
                'character': 'an artist\'s apprentice named Lorenzo in Florence, surrounded by beauty and innovation in a world being reborn',
                'setting': 'Renaissance Florence, art studios, marble sculptures, paintings, architectural marvels',
                'mood': 'inspired and creative'
            },
            'The Industrial Revolution': {
                'character': 'a mill worker named William in Manchester, experiencing the dramatic transformation of society and labor',
                'setting': 'Victorian-era textile mill, steam engines, industrial machinery, smoky atmosphere',
                'mood': 'determined but weary'
            }
        }
        
        persona_data = personas.get(era, {
            'character': f'a person living through {era}',
            'setting': f'scene from {era}',
            'mood': 'reflective'
        })
        
        # Generate diary entry
        diary_prompt = f"You are {persona_data['character']}. Write a short, emotional, first-person diary entry about your life right now, capturing your authentic feelings about {era}. Your tone should be personal and reflective. Do not break character. Make it vivid and immersive."
        
        # Generate historical image
        image_prompt = f"Create a historically accurate, atmospheric image depicting {persona_data['setting']} during {era}. The mood should be {persona_data['mood']}. Style: photorealistic historical photograph with period-appropriate details, lighting, and atmosphere. High quality, detailed, immersive."
        
        # Generate content using Gemini
        text_model = genai.GenerativeModel('gemini-1.5-flash')
        
        # Enhanced diary prompt with more character depth
        enhanced_diary_prompt = f"""
        You are {persona_data['character']}. 
        
        Write a deeply personal diary entry (150-200 words) about your life during {era}. Include:
        - Your daily struggles and hopes
        - Specific details about your environment and the people around you
        - Your emotions about the historical moment you're living through
        - Personal dreams and fears for the future
        
        Write in first person, be authentic and emotional. Make it feel like a real person's private thoughts.
        """
        
        # Generate diary entry
        diary_response = text_model.generate_content(enhanced_diary_prompt)
        
        # Generate character backstory for richer context
        character_prompt = f"""
        Create a detailed character profile for {persona_data['character']} during {era}.
        Include: full name, age, occupation, family situation, personality traits, and current life circumstances.
        Format as a brief character description (50-75 words).
        """
        
        character_response = text_model.generate_content(character_prompt)
        
        # Generate comprehensive historical context
        context_prompt = f"""
        Create a comprehensive historical context for {era} covering:
        
        1. **Daily Life & Social Conditions**: What was everyday life really like for ordinary people? Include details about work, family life, social customs, and living conditions.
        
        2. **Economic & Political Climate**: How did economic and political factors affect regular citizens? What were the major challenges and opportunities?
        
        3. **Cultural & Technological Changes**: What innovations, cultural shifts, or technological advances were transforming society? How did people adapt?
        
        4. **Lesser-Known Facts**: Include 2-3 fascinating details that most people don't know about this period - focus on surprising or counterintuitive aspects of daily life.
        
        5. **Social Dynamics**: How did different social classes, genders, or ethnic groups experience this period differently?
        
        Format as 5-6 detailed but concise paragraphs (200-250 words total). Make it engaging and educational, focusing on human experiences rather than just dates and events.
        """
        
        context_response = text_model.generate_content(context_prompt)
        
        # Generate atmospheric placeholder images
        generated_image_url = None
        try:
            # Create thematic placeholder images based on historical periods
            image_themes = {
                'The Roaring Twenties': 'https://picsum.photos/800/600?random=1920&sepia',
                'The Great Depression': 'https://picsum.photos/800/600?random=1930&grayscale',
                'The Space Race': 'https://picsum.photos/800/600?random=1960&blur=1',
                'The 1960s Counter-culture': 'https://picsum.photos/800/600?random=1965',
                'The Dawn of the Internet': 'https://picsum.photos/800/600?random=1990&blur=2',
                'World War II Home Front': 'https://picsum.photos/800/600?random=1940&grayscale',
                'The Renaissance': 'https://picsum.photos/800/600?random=1500&sepia',
                'The Industrial Revolution': 'https://picsum.photos/800/600?random=1850&grayscale'
            }
            
            # Use themed placeholder or generate one based on era hash
            generated_image_url = image_themes.get(era, f"https://picsum.photos/800/600?random={hash(era)}&sepia")
            
        except Exception as img_error:
            print(f"Image generation error: {img_error}")
            generated_image_url = f"https://picsum.photos/800/600?random={hash(era)}&sepia"
        
        # Extract character name more reliably
        character_name = 'Anonymous'
        if ' named ' in persona_data['character']:
            try:
                character_name = persona_data['character'].split(' named ')[1].split(' ')[0]
            except:
                character_name = 'Anonymous'
        
        response_data = {
            'diary_entry': diary_response.text,
            'character_name': character_name,
            'character_profile': character_response.text,
            'historical_context': context_response.text,
            'era': era,
            'mood': persona_data['mood'],
            'setting': persona_data['setting'],
            'image_url': generated_image_url,
            'timestamp': datetime.now().strftime('%B %d, %Y'),
            'success': True
        }
        
        # Save story to database if user is authenticated and requested
        if current_user.is_authenticated and save_story:
            try:
                # Create story record
                story = Story(
                    user_id=current_user.id,
                    title=f"Diary Entry from {era}",
                    content=diary_response.text,
                    era=era,
                    character_name=character_name,
                    character_profile=character_response.text,
                    historical_context=context_response.text,
                    image_url=generated_image_url,
                    is_public=is_public,
                    tags=json.dumps([era.lower().replace(' ', '_'), persona_data['mood']])
                )
                
                db.session.add(story)
                db.session.commit()
                
                response_data['story_id'] = story.id
                response_data['saved'] = True
                
                # Check for achievements
                check_and_award_achievements(current_user.id)
                
            except Exception as save_error:
                print(f"Error saving story: {save_error}")
                db.session.rollback()
                response_data['save_error'] = 'Failed to save story'
        
        return jsonify(response_data)
        
    except Exception as e:
        return jsonify({'error': f'An error occurred: {str(e)}'}), 500

if __name__ == '__main__':
    app.run(debug=True)
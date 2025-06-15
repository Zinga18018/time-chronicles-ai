from flask_sqlalchemy import SQLAlchemy
from flask_login import UserMixin
from datetime import datetime
import json

db = SQLAlchemy()

class User(UserMixin, db.Model):
    id = db.Column(db.Integer, primary_key=True)
    username = db.Column(db.String(80), unique=True, nullable=False)
    email = db.Column(db.String(120), unique=True, nullable=False)
    password_hash = db.Column(db.String(128))
    created_at = db.Column(db.DateTime, default=datetime.utcnow)
    preferences = db.Column(db.Text)  # JSON string for user preferences
    
    # Relationships
    stories = db.relationship('Story', backref='author', lazy=True)
    bookmarks = db.relationship('Bookmark', backref='user', lazy=True)
    achievements = db.relationship('UserAchievement', backref='user', lazy=True)
    
    def get_preferences(self):
        return json.loads(self.preferences) if self.preferences else {}
    
    def set_preferences(self, prefs):
        self.preferences = json.dumps(prefs)

class Story(db.Model):
    id = db.Column(db.Integer, primary_key=True)
    title = db.Column(db.String(200), nullable=False)
    content = db.Column(db.Text, nullable=False)
    era = db.Column(db.String(100), nullable=False)
    character_name = db.Column(db.String(100))
    character_profile = db.Column(db.Text)
    historical_context = db.Column(db.Text)
    image_url = db.Column(db.String(500))
    created_at = db.Column(db.DateTime, default=datetime.utcnow)
    user_id = db.Column(db.Integer, db.ForeignKey('user.id'), nullable=True)
    is_public = db.Column(db.Boolean, default=False)
    rating_sum = db.Column(db.Integer, default=0)
    rating_count = db.Column(db.Integer, default=0)
    view_count = db.Column(db.Integer, default=0)
    
    # Story continuation support
    parent_story_id = db.Column(db.Integer, db.ForeignKey('story.id'), nullable=True)
    sequence_number = db.Column(db.Integer, default=1)
    
    # Relationships
    bookmarks = db.relationship('Bookmark', backref='story', lazy=True)
    ratings = db.relationship('StoryRating', backref='story', lazy=True)
    comments = db.relationship('StoryComment', backref='story', lazy=True)
    continuations = db.relationship('Story', backref=db.backref('parent', remote_side=[id]))
    
    @property
    def average_rating(self):
        return self.rating_sum / self.rating_count if self.rating_count > 0 else 0
    
    def get_tags(self):
        # For now, return empty list since we don't have tags field
        return []
    
    def get_average_rating(self):
        return self.average_rating
    
    def get_bookmark_count(self):
        return len(self.bookmarks)
    
    def get_comment_count(self):
        return len(self.comments)

class Character(db.Model):
    id = db.Column(db.Integer, primary_key=True)
    name = db.Column(db.String(100), nullable=False)
    era = db.Column(db.String(100), nullable=False)
    occupation = db.Column(db.String(100))
    age = db.Column(db.Integer)
    gender = db.Column(db.String(20))
    social_class = db.Column(db.String(50))
    personality_traits = db.Column(db.Text)  # JSON string
    background_story = db.Column(db.Text)
    relationships = db.Column(db.Text)  # JSON string
    created_at = db.Column(db.DateTime, default=datetime.utcnow)
    user_id = db.Column(db.Integer, db.ForeignKey('user.id'), nullable=True)
    
    def get_personality_traits(self):
        return json.loads(self.personality_traits) if self.personality_traits else []
    
    def get_relationships(self):
        return json.loads(self.relationships) if self.relationships else {}

class Bookmark(db.Model):
    id = db.Column(db.Integer, primary_key=True)
    user_id = db.Column(db.Integer, db.ForeignKey('user.id'), nullable=False)
    story_id = db.Column(db.Integer, db.ForeignKey('story.id'), nullable=False)
    created_at = db.Column(db.DateTime, default=datetime.utcnow)
    notes = db.Column(db.Text)

class StoryRating(db.Model):
    id = db.Column(db.Integer, primary_key=True)
    user_id = db.Column(db.Integer, db.ForeignKey('user.id'), nullable=False)
    story_id = db.Column(db.Integer, db.ForeignKey('story.id'), nullable=False)
    rating = db.Column(db.Integer, nullable=False)  # 1-5 stars
    created_at = db.Column(db.DateTime, default=datetime.utcnow)
    
    __table_args__ = (db.UniqueConstraint('user_id', 'story_id'),)

class StoryComment(db.Model):
    id = db.Column(db.Integer, primary_key=True)
    user_id = db.Column(db.Integer, db.ForeignKey('user.id'), nullable=False)
    story_id = db.Column(db.Integer, db.ForeignKey('story.id'), nullable=False)
    content = db.Column(db.Text, nullable=False)
    created_at = db.Column(db.DateTime, default=datetime.utcnow)
    
    user = db.relationship('User', backref='comments')

class Achievement(db.Model):
    id = db.Column(db.Integer, primary_key=True)
    name = db.Column(db.String(100), unique=True, nullable=False)
    description = db.Column(db.Text)
    icon = db.Column(db.String(50))
    category = db.Column(db.String(50))
    points = db.Column(db.Integer, default=0)
    condition_type = db.Column(db.String(50))  # e.g., 'story_count', 'era_count'
    condition_value = db.Column(db.Integer)    # threshold value
    
class UserAchievement(db.Model):
    id = db.Column(db.Integer, primary_key=True)
    user_id = db.Column(db.Integer, db.ForeignKey('user.id'), nullable=False)
    achievement_id = db.Column(db.Integer, db.ForeignKey('achievement.id'), nullable=False)
    earned_at = db.Column(db.DateTime, default=datetime.utcnow)
    
    achievement = db.relationship('Achievement', backref='user_achievements')
    __table_args__ = (db.UniqueConstraint('user_id', 'achievement_id'),)

class UserAnalytics(db.Model):
    id = db.Column(db.Integer, primary_key=True)
    user_id = db.Column(db.Integer, db.ForeignKey('user.id'), nullable=True)
    session_id = db.Column(db.String(100))
    action = db.Column(db.String(100), nullable=False)
    data = db.Column(db.Text)  # JSON string for additional data
    timestamp = db.Column(db.DateTime, default=datetime.utcnow)
    ip_address = db.Column(db.String(45))
    user_agent = db.Column(db.Text)

class HistoricalEvent(db.Model):
    id = db.Column(db.Integer, primary_key=True)
    title = db.Column(db.String(200), nullable=False)
    description = db.Column(db.Text)
    date = db.Column(db.Date)
    era = db.Column(db.String(100))
    importance_level = db.Column(db.Integer, default=1)  # 1-5 scale
    tags = db.Column(db.Text)  # JSON array of tags
    
    def get_tags(self):
        return json.loads(self.tags) if self.tags else []
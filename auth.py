from flask import Blueprint, render_template, request, flash, redirect, url_for, jsonify
from flask_login import login_user, logout_user, login_required, current_user
from werkzeug.security import generate_password_hash, check_password_hash
from models import db, User
import re

auth = Blueprint('auth', __name__)

def validate_email(email):
    pattern = r'^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$'
    return re.match(pattern, email) is not None

def validate_password(password):
    return len(password) >= 8 and any(c.isdigit() for c in password) and any(c.isalpha() for c in password)

@auth.route('/register', methods=['GET', 'POST'])
def register():
    if request.method == 'POST':
        data = request.get_json() if request.is_json else request.form
        username = data.get('username', '').strip()
        email = data.get('email', '').strip().lower()
        password = data.get('password', '')
        
        # Validation
        errors = []
        if len(username) < 3:
            errors.append('Username must be at least 3 characters long')
        if not validate_email(email):
            errors.append('Invalid email format')
        if not validate_password(password):
            errors.append('Password must be at least 8 characters with letters and numbers')
        
        # Check if user exists
        if User.query.filter_by(username=username).first():
            errors.append('Username already exists')
        if User.query.filter_by(email=email).first():
            errors.append('Email already registered')
        
        if errors:
            if request.is_json:
                return jsonify({'success': False, 'errors': errors}), 400
            for error in errors:
                flash(error, 'error')
            return render_template('auth/register.html')
        
        # Create user
        user = User(
            username=username,
            email=email,
            password_hash=generate_password_hash(password)
        )
        
        try:
            db.session.add(user)
            db.session.commit()
            login_user(user)
            
            if request.is_json:
                return jsonify({'success': True, 'message': 'Registration successful'})
            flash('Registration successful!', 'success')
            return redirect(url_for('index'))
        except Exception as e:
            db.session.rollback()
            if request.is_json:
                return jsonify({'success': False, 'errors': ['Registration failed']}), 500
            flash('Registration failed. Please try again.', 'error')
    
    return render_template('auth/register.html')

@auth.route('/login', methods=['GET', 'POST'])
def login():
    if request.method == 'POST':
        data = request.get_json() if request.is_json else request.form
        username_or_email = data.get('username_or_email', '').strip()
        password = data.get('password', '')
        remember = data.get('remember', False)
        
        # Find user by username or email
        user = User.query.filter(
            (User.username == username_or_email) | (User.email == username_or_email.lower())
        ).first()
        
        if user and check_password_hash(user.password_hash, password):
            login_user(user, remember=remember)
            
            if request.is_json:
                return jsonify({
                    'success': True, 
                    'message': 'Login successful',
                    'user': {
                        'id': user.id,
                        'username': user.username,
                        'email': user.email
                    }
                })
            
            next_page = request.args.get('next')
            return redirect(next_page) if next_page else redirect(url_for('index'))
        else:
            error = 'Invalid username/email or password'
            if request.is_json:
                return jsonify({'success': False, 'error': error}), 401
            flash(error, 'error')
    
    return render_template('auth/login.html')

@auth.route('/logout')
@login_required
def logout():
    logout_user()
    if request.is_json:
        return jsonify({'success': True, 'message': 'Logged out successfully'})
    flash('You have been logged out.', 'info')
    return redirect(url_for('index'))

@auth.route('/profile')
@login_required
def profile():
    return render_template('auth/profile.html', user=current_user)

@auth.route('/profile/update', methods=['POST'])
@login_required
def update_profile():
    data = request.get_json() if request.is_json else request.form
    
    # Update preferences
    preferences = {
        'theme': data.get('theme', 'dark'),
        'auto_play_audio': data.get('auto_play_audio', False),
        'typewriter_speed': data.get('typewriter_speed', 'medium'),
        'preferred_eras': data.getlist('preferred_eras') if hasattr(data, 'getlist') else data.get('preferred_eras', []),
        'accessibility': {
            'high_contrast': data.get('high_contrast', False),
            'large_text': data.get('large_text', False),
            'reduce_motion': data.get('reduce_motion', False)
        }
    }
    
    current_user.set_preferences(preferences)
    
    try:
        db.session.commit()
        if request.is_json:
            return jsonify({'success': True, 'message': 'Profile updated successfully'})
        flash('Profile updated successfully!', 'success')
    except Exception as e:
        db.session.rollback()
        if request.is_json:
            return jsonify({'success': False, 'error': 'Update failed'}), 500
        flash('Update failed. Please try again.', 'error')
    
    return redirect(url_for('auth.profile'))

@auth.route('/change-password', methods=['POST'])
@login_required
def change_password():
    data = request.get_json() if request.is_json else request.form
    current_password = data.get('current_password', '')
    new_password = data.get('new_password', '')
    confirm_password = data.get('confirm_password', '')
    
    errors = []
    
    if not check_password_hash(current_user.password_hash, current_password):
        errors.append('Current password is incorrect')
    
    if not validate_password(new_password):
        errors.append('New password must be at least 8 characters with letters and numbers')
    
    if new_password != confirm_password:
        errors.append('New passwords do not match')
    
    if errors:
        if request.is_json:
            return jsonify({'success': False, 'errors': errors}), 400
        for error in errors:
            flash(error, 'error')
        return redirect(url_for('auth.profile'))
    
    current_user.password_hash = generate_password_hash(new_password)
    
    try:
        db.session.commit()
        if request.is_json:
            return jsonify({'success': True, 'message': 'Password changed successfully'})
        flash('Password changed successfully!', 'success')
    except Exception as e:
        db.session.rollback()
        if request.is_json:
            return jsonify({'success': False, 'error': 'Password change failed'}), 500
        flash('Password change failed. Please try again.', 'error')
    
    return redirect(url_for('auth.profile'))

@auth.route('/delete-account', methods=['POST'])
@login_required
def delete_account():
    data = request.get_json() if request.is_json else request.form
    password = data.get('password', '')
    
    if not check_password_hash(current_user.password_hash, password):
        if request.is_json:
            return jsonify({'success': False, 'error': 'Incorrect password'}), 401
        flash('Incorrect password', 'error')
        return redirect(url_for('auth.profile'))
    
    try:
        # Delete user data
        user_id = current_user.id
        logout_user()
        
        # Delete related data
        from models import Story, Bookmark, StoryRating, StoryComment, UserAchievement, UserAnalytics
        
        UserAnalytics.query.filter_by(user_id=user_id).delete()
        UserAchievement.query.filter_by(user_id=user_id).delete()
        StoryComment.query.filter_by(user_id=user_id).delete()
        StoryRating.query.filter_by(user_id=user_id).delete()
        Bookmark.query.filter_by(user_id=user_id).delete()
        Story.query.filter_by(user_id=user_id).delete()
        User.query.filter_by(id=user_id).delete()
        
        db.session.commit()
        
        if request.is_json:
            return jsonify({'success': True, 'message': 'Account deleted successfully'})
        flash('Account deleted successfully', 'info')
        return redirect(url_for('index'))
    except Exception as e:
        db.session.rollback()
        if request.is_json:
            return jsonify({'success': False, 'error': 'Account deletion failed'}), 500
        flash('Account deletion failed. Please try again.', 'error')
        return redirect(url_for('auth.profile'))
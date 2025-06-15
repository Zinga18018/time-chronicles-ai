from flask import Blueprint, request, jsonify, session
from flask_login import login_required, current_user
from models import db, Story, Character, Bookmark, StoryRating, StoryComment, Achievement, UserAchievement, UserAnalytics, HistoricalEvent
from datetime import datetime, timedelta
from sqlalchemy import func, desc, and_
import json

api = Blueprint('api', __name__, url_prefix='/api')

# Story Management
@api.route('/stories', methods=['GET'])
def get_stories():
    page = request.args.get('page', 1, type=int)
    per_page = min(request.args.get('per_page', 10, type=int), 50)
    era = request.args.get('era')
    user_id = request.args.get('user_id', type=int)
    sort_by = request.args.get('sort_by', 'created_at')
    
    query = Story.query
    
    if era:
        query = query.filter(Story.era == era)
    if user_id:
        query = query.filter(Story.user_id == user_id)
    
    # Sorting
    if sort_by == 'rating':
        query = query.outerjoin(StoryRating).group_by(Story.id).order_by(desc(func.avg(StoryRating.rating)))
    elif sort_by == 'popularity':
        query = query.outerjoin(Bookmark).group_by(Story.id).order_by(desc(func.count(Bookmark.id)))
    else:
        query = query.order_by(desc(Story.created_at))
    
    stories = query.paginate(page=page, per_page=per_page, error_out=False)
    
    return jsonify({
        'stories': [{
            'id': story.id,
            'title': story.title,
            'content': story.content,
            'era': story.era,
            'character_name': story.character_name,
            'created_at': story.created_at.isoformat(),
            'is_public': story.is_public,
            'tags': story.get_tags(),
            'avg_rating': story.get_average_rating(),
            'bookmark_count': story.get_bookmark_count(),
            'comment_count': story.get_comment_count()
        } for story in stories.items],
        'pagination': {
            'page': page,
            'pages': stories.pages,
            'per_page': per_page,
            'total': stories.total,
            'has_next': stories.has_next,
            'has_prev': stories.has_prev
        }
    })

@api.route('/stories/<int:story_id>', methods=['GET'])
def get_story(story_id):
    story = Story.query.get_or_404(story_id)
    
    # Check if story is public or belongs to current user
    if not story.is_public and (not current_user.is_authenticated or story.user_id != current_user.id):
        return jsonify({'error': 'Story not found'}), 404
    
    return jsonify({
        'id': story.id,
        'title': story.title,
        'content': story.content,
        'era': story.era,
        'character_name': story.character_name,
        'character_profile': story.character_profile,
        'historical_context': story.historical_context,
        'image_url': story.image_url,
        'created_at': story.created_at.isoformat(),
        'is_public': story.is_public,
        'tags': story.get_tags(),
        'avg_rating': story.get_average_rating(),
        'bookmark_count': story.get_bookmark_count(),
        'comment_count': story.get_comment_count(),
        'user_rating': story.get_user_rating(current_user.id) if current_user.is_authenticated else None,
        'is_bookmarked': story.is_bookmarked_by(current_user.id) if current_user.is_authenticated else False
    })

@api.route('/stories/<int:story_id>/rate', methods=['POST'])
@login_required
def rate_story(story_id):
    story = Story.query.get_or_404(story_id)
    rating_value = request.json.get('rating')
    
    if not rating_value or rating_value < 1 or rating_value > 5:
        return jsonify({'error': 'Rating must be between 1 and 5'}), 400
    
    # Check if user already rated this story
    existing_rating = StoryRating.query.filter_by(story_id=story_id, user_id=current_user.id).first()
    
    if existing_rating:
        existing_rating.rating = rating_value
        existing_rating.updated_at = datetime.utcnow()
    else:
        rating = StoryRating(story_id=story_id, user_id=current_user.id, rating=rating_value)
        db.session.add(rating)
    
    try:
        db.session.commit()
        return jsonify({'success': True, 'message': 'Rating saved successfully'})
    except Exception as e:
        db.session.rollback()
        return jsonify({'error': 'Failed to save rating'}), 500

@api.route('/stories/<int:story_id>/bookmark', methods=['POST'])
@login_required
def toggle_bookmark(story_id):
    story = Story.query.get_or_404(story_id)
    
    existing_bookmark = Bookmark.query.filter_by(story_id=story_id, user_id=current_user.id).first()
    
    if existing_bookmark:
        db.session.delete(existing_bookmark)
        action = 'removed'
    else:
        bookmark = Bookmark(story_id=story_id, user_id=current_user.id)
        db.session.add(bookmark)
        action = 'added'
    
    try:
        db.session.commit()
        return jsonify({'success': True, 'action': action})
    except Exception as e:
        db.session.rollback()
        return jsonify({'error': 'Failed to update bookmark'}), 500

@api.route('/stories/<int:story_id>/comments', methods=['GET', 'POST'])
def story_comments(story_id):
    story = Story.query.get_or_404(story_id)
    
    if request.method == 'GET':
        page = request.args.get('page', 1, type=int)
        per_page = min(request.args.get('per_page', 20, type=int), 50)
        
        comments = StoryComment.query.filter_by(story_id=story_id).order_by(desc(StoryComment.created_at)).paginate(
            page=page, per_page=per_page, error_out=False
        )
        
        return jsonify({
            'comments': [{
                'id': comment.id,
                'content': comment.content,
                'username': comment.user.username,
                'created_at': comment.created_at.isoformat()
            } for comment in comments.items],
            'pagination': {
                'page': page,
                'pages': comments.pages,
                'per_page': per_page,
                'total': comments.total
            }
        })
    
    elif request.method == 'POST':
        if not current_user.is_authenticated:
            return jsonify({'error': 'Authentication required'}), 401
        
        content = request.json.get('content', '').strip()
        if not content:
            return jsonify({'error': 'Comment content is required'}), 400
        
        comment = StoryComment(story_id=story_id, user_id=current_user.id, content=content)
        
        try:
            db.session.add(comment)
            db.session.commit()
            return jsonify({
                'success': True,
                'comment': {
                    'id': comment.id,
                    'content': comment.content,
                    'username': comment.user.username,
                    'created_at': comment.created_at.isoformat()
                }
            })
        except Exception as e:
            db.session.rollback()
            return jsonify({'error': 'Failed to add comment'}), 500

# User Analytics
@api.route('/analytics/track', methods=['POST'])
@login_required
def track_analytics():
    event_type = request.json.get('event_type')
    event_data = request.json.get('event_data', {})
    
    if not event_type:
        return jsonify({'error': 'Event type is required'}), 400
    
    analytics = UserAnalytics(
        user_id=current_user.id,
        event_type=event_type,
        event_data=event_data
    )
    
    try:
        db.session.add(analytics)
        db.session.commit()
        return jsonify({'success': True})
    except Exception as e:
        db.session.rollback()
        return jsonify({'error': 'Failed to track event'}), 500

@api.route('/analytics/dashboard')
@login_required
def analytics_dashboard():
    # Get user statistics
    total_stories = Story.query.filter_by(user_id=current_user.id).count()
    total_bookmarks = Bookmark.query.filter_by(user_id=current_user.id).count()
    total_ratings = StoryRating.query.filter_by(user_id=current_user.id).count()
    
    # Get era preferences
    era_stats = db.session.query(
        Story.era, func.count(Story.id).label('count')
    ).filter_by(user_id=current_user.id).group_by(Story.era).all()
    
    # Get recent activity
    recent_stories = Story.query.filter_by(user_id=current_user.id).order_by(desc(Story.created_at)).limit(5).all()
    
    # Get achievements
    user_achievements = db.session.query(Achievement).join(UserAchievement).filter(
        UserAchievement.user_id == current_user.id
    ).all()
    
    return jsonify({
        'stats': {
            'total_stories': total_stories,
            'total_bookmarks': total_bookmarks,
            'total_ratings': total_ratings,
            'achievements_count': len(user_achievements)
        },
        'era_preferences': [{'era': era, 'count': count} for era, count in era_stats],
        'recent_stories': [{
            'id': story.id,
            'title': story.title,
            'era': story.era,
            'created_at': story.created_at.isoformat()
        } for story in recent_stories],
        'achievements': [{
            'id': achievement.id,
            'name': achievement.name,
            'description': achievement.description,
            'icon': achievement.icon
        } for achievement in user_achievements]
    })

# Historical Events
@api.route('/historical-events')
def get_historical_events():
    era = request.args.get('era')
    date = request.args.get('date')
    
    query = HistoricalEvent.query
    
    if era:
        query = query.filter(HistoricalEvent.era == era)
    if date:
        try:
            date_obj = datetime.strptime(date, '%Y-%m-%d').date()
            query = query.filter(HistoricalEvent.date == date_obj)
        except ValueError:
            return jsonify({'error': 'Invalid date format. Use YYYY-MM-DD'}), 400
    
    events = query.order_by(HistoricalEvent.date).limit(50).all()
    
    return jsonify({
        'events': [{
            'id': event.id,
            'title': event.title,
            'description': event.description,
            'date': event.date.isoformat() if event.date else None,
            'era': event.era,
            'importance': event.importance,
            'tags': event.get_tags()
        } for event in events]
    })

# Search
@api.route('/search')
def search():
    query = request.args.get('q', '').strip()
    search_type = request.args.get('type', 'all')  # all, stories, events
    page = request.args.get('page', 1, type=int)
    per_page = min(request.args.get('per_page', 10, type=int), 50)
    
    if not query:
        return jsonify({'error': 'Search query is required'}), 400
    
    results = {'stories': [], 'events': []}
    
    if search_type in ['all', 'stories']:
        story_query = Story.query.filter(
            and_(
                Story.is_public == True,
                db.or_(
                    Story.title.contains(query),
                    Story.content.contains(query),
                    Story.character_name.contains(query),
                    Story.era.contains(query)
                )
            )
        ).order_by(desc(Story.created_at))
        
        if search_type == 'stories':
            stories = story_query.paginate(page=page, per_page=per_page, error_out=False)
            results['stories'] = [{
                'id': story.id,
                'title': story.title,
                'era': story.era,
                'character_name': story.character_name,
                'created_at': story.created_at.isoformat(),
                'avg_rating': story.get_average_rating()
            } for story in stories.items]
            results['pagination'] = {
                'page': page,
                'pages': stories.pages,
                'total': stories.total
            }
        else:
            stories = story_query.limit(5).all()
            results['stories'] = [{
                'id': story.id,
                'title': story.title,
                'era': story.era,
                'character_name': story.character_name
            } for story in stories]
    
    if search_type in ['all', 'events']:
        event_query = HistoricalEvent.query.filter(
            db.or_(
                HistoricalEvent.title.contains(query),
                HistoricalEvent.description.contains(query),
                HistoricalEvent.era.contains(query)
            )
        ).order_by(desc(HistoricalEvent.importance))
        
        if search_type == 'events':
            events = event_query.paginate(page=page, per_page=per_page, error_out=False)
            results['events'] = [{
                'id': event.id,
                'title': event.title,
                'description': event.description,
                'date': event.date.isoformat() if event.date else None,
                'era': event.era,
                'importance': event.importance
            } for event in events.items]
            results['pagination'] = {
                'page': page,
                'pages': events.pages,
                'total': events.total
            }
        else:
            events = event_query.limit(5).all()
            results['events'] = [{
                'id': event.id,
                'title': event.title,
                'era': event.era,
                'date': event.date.isoformat() if event.date else None
            } for event in events]
    
    return jsonify(results)

# Recommendations
@api.route('/recommendations')
@login_required
def get_recommendations():
    # Get user's preferred eras based on their stories
    user_eras = db.session.query(
        Story.era, func.count(Story.id).label('count')
    ).filter_by(user_id=current_user.id).group_by(Story.era).order_by(desc('count')).limit(3).all()
    
    if not user_eras:
        # If no user stories, recommend popular stories
        recommended_stories = Story.query.filter_by(is_public=True).outerjoin(StoryRating).group_by(Story.id).order_by(
            desc(func.avg(StoryRating.rating))
        ).limit(10).all()
    else:
        # Recommend stories from user's preferred eras
        preferred_eras = [era for era, count in user_eras]
        recommended_stories = Story.query.filter(
            and_(
                Story.is_public == True,
                Story.era.in_(preferred_eras),
                Story.user_id != current_user.id
            )
        ).outerjoin(StoryRating).group_by(Story.id).order_by(
            desc(func.avg(StoryRating.rating))
        ).limit(10).all()
    
    return jsonify({
        'recommended_stories': [{
            'id': story.id,
            'title': story.title,
            'era': story.era,
            'character_name': story.character_name,
            'avg_rating': story.get_average_rating(),
            'bookmark_count': story.get_bookmark_count()
        } for story in recommended_stories]
    })

# User Management
@api.route('/user/status')
def user_status():
    """Get current user authentication status"""
    if current_user.is_authenticated:
        return jsonify({
            'authenticated': True,
            'user': {
                'id': current_user.id,
                'username': current_user.username,
                'email': current_user.email
            }
        })
    else:
        return jsonify({'authenticated': False})

@api.route('/user/preferences', methods=['GET'])
@login_required
def get_user_preferences():
    """Get user preferences"""
    return jsonify(current_user.get_preferences())

@api.route('/user/preferences', methods=['POST'])
@login_required
def update_user_preferences():
    """Update user preferences"""
    try:
        preferences = request.get_json()
        current_user.set_preferences(preferences)
        db.session.commit()
        return jsonify({'success': True})
    except Exception as e:
        db.session.rollback()
        return jsonify({'error': 'Failed to update preferences'}), 500

# Error handlers
@api.errorhandler(404)
def not_found(error):
    return jsonify({'error': 'Resource not found'}), 404

@api.errorhandler(500)
def internal_error(error):
    db.session.rollback()
    return jsonify({'error': 'Internal server error'}), 500
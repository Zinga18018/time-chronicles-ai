class ProfileManager {
    constructor() {
        this.currentTab = 'dashboard';
        this.userStats = {};
        this.init();
    }

    init() {
        this.bindEvents();
        this.loadDashboard();
    }

    bindEvents() {
        // Tab switching
        document.querySelectorAll('.tab-btn').forEach(btn => {
            btn.addEventListener('click', (e) => {
                const tabName = e.target.dataset.tab;
                this.switchTab(tabName);
            });
        });

        // Forms
        const preferencesForm = document.getElementById('preferencesForm');
        if (preferencesForm) {
            preferencesForm.addEventListener('submit', (e) => this.savePreferences(e));
        }

        const passwordForm = document.getElementById('passwordForm');
        if (passwordForm) {
            passwordForm.addEventListener('submit', (e) => this.changePassword(e));
        }

        const deleteForm = document.getElementById('deleteForm');
        if (deleteForm) {
            deleteForm.addEventListener('submit', (e) => this.deleteAccount(e));
        }

        // Delete account button
        const deleteBtn = document.getElementById('deleteAccountBtn');
        if (deleteBtn) {
            deleteBtn.addEventListener('click', () => this.showDeleteModal());
        }

        // Filters
        const eraFilter = document.getElementById('eraFilter');
        const sortFilter = document.getElementById('sortFilter');
        if (eraFilter && sortFilter) {
            eraFilter.addEventListener('change', () => this.filterStories());
            sortFilter.addEventListener('change', () => this.filterStories());
        }
    }

    switchTab(tabName) {
        // Update active tab button
        document.querySelectorAll('.tab-btn').forEach(btn => {
            btn.classList.remove('active');
        });
        document.querySelector(`[data-tab="${tabName}"]`).classList.add('active');

        // Update active tab content
        document.querySelectorAll('.tab-content').forEach(content => {
            content.classList.remove('active');
        });
        document.getElementById(tabName).classList.add('active');

        this.currentTab = tabName;

        // Load tab-specific content
        switch (tabName) {
            case 'dashboard':
                this.loadDashboard();
                break;
            case 'stories':
                this.loadUserStories();
                break;
            case 'achievements':
                this.loadAchievements();
                break;
            case 'settings':
                this.loadSettings();
                break;
        }
    }

    async loadDashboard() {
        try {
            const response = await fetch('/api/user/dashboard');
            const data = await response.json();

            if (data.success) {
                this.userStats = data.stats;
                this.updateDashboardStats(data.stats);
                this.updateEraChart(data.era_stats);
                this.updateRecentStories(data.recent_stories);
            }
        } catch (error) {
            console.error('Error loading dashboard:', error);
        }
    }

    updateDashboardStats(stats) {
        document.getElementById('totalStories').textContent = stats.total_stories || 0;
        document.getElementById('totalBookmarks').textContent = stats.total_bookmarks || 0;
        document.getElementById('totalRatings').textContent = stats.total_ratings || 0;
        document.getElementById('totalAchievements').textContent = stats.total_achievements || 0;
    }

    updateEraChart(eraStats) {
        const chartContainer = document.getElementById('eraChart');
        
        if (!eraStats || Object.keys(eraStats).length === 0) {
            chartContainer.innerHTML = '<p class="no-data">No stories written yet</p>';
            return;
        }

        const maxCount = Math.max(...Object.values(eraStats));
        let chartHTML = '<div class="era-chart">';
        
        for (const [era, count] of Object.entries(eraStats)) {
            const percentage = (count / maxCount) * 100;
            chartHTML += `
                <div class="era-bar">
                    <div class="era-label">${era}</div>
                    <div class="era-progress">
                        <div class="era-fill" style="width: ${percentage}%"></div>
                    </div>
                    <div class="era-count">${count}</div>
                </div>
            `;
        }
        
        chartHTML += '</div>';
        chartContainer.innerHTML = chartHTML;
    }

    updateRecentStories(stories) {
        const container = document.getElementById('recentStories');
        
        if (!stories || stories.length === 0) {
            container.innerHTML = '<p class="no-data">No stories written yet</p>';
            return;
        }

        let storiesHTML = '';
        stories.forEach(story => {
            storiesHTML += `
                <div class="recent-story">
                    <h4>${story.title || 'Untitled Story'}</h4>
                    <p class="story-era">${story.era}</p>
                    <p class="story-date">${new Date(story.created_at).toLocaleDateString()}</p>
                    <div class="story-rating">
                        ${this.renderStars(story.average_rating || 0)}
                        <span>(${story.rating_count || 0} ratings)</span>
                    </div>
                </div>
            `;
        });
        
        container.innerHTML = storiesHTML;
    }

    async loadUserStories() {
        try {
            const response = await fetch('/api/user/stories');
            const data = await response.json();

            if (data.success) {
                this.renderStories(data.stories);
            }
        } catch (error) {
            console.error('Error loading user stories:', error);
            document.getElementById('userStories').innerHTML = '<p class="error">Error loading stories</p>';
        }
    }

    renderStories(stories) {
        const container = document.getElementById('userStories');
        
        if (!stories || stories.length === 0) {
            container.innerHTML = '<p class="no-data">No stories found</p>';
            return;
        }

        let storiesHTML = '';
        stories.forEach(story => {
            storiesHTML += `
                <div class="story-card">
                    <h4>${story.title || 'Untitled Story'}</h4>
                    <p class="story-era">${story.era}</p>
                    <p class="story-excerpt">${this.truncateText(story.content, 150)}</p>
                    <div class="story-meta">
                        <span class="story-date">${new Date(story.created_at).toLocaleDateString()}</span>
                        <div class="story-rating">
                            ${this.renderStars(story.average_rating || 0)}
                            <span>(${story.rating_count || 0})</span>
                        </div>
                    </div>
                    <div class="story-actions">
                        <button class="btn secondary" onclick="profileManager.viewStory(${story.id})">View</button>
                        <button class="btn secondary" onclick="profileManager.editStory(${story.id})">Edit</button>
                        <button class="btn danger" onclick="profileManager.deleteStory(${story.id})">Delete</button>
                    </div>
                </div>
            `;
        });
        
        container.innerHTML = storiesHTML;
    }

    async filterStories() {
        const era = document.getElementById('eraFilter').value;
        const sort = document.getElementById('sortFilter').value;
        
        const params = new URLSearchParams();
        if (era) params.append('era', era);
        if (sort) params.append('sort', sort);
        
        try {
            const response = await fetch(`/api/user/stories?${params}`);
            const data = await response.json();
            
            if (data.success) {
                this.renderStories(data.stories);
            }
        } catch (error) {
            console.error('Error filtering stories:', error);
        }
    }

    async loadAchievements() {
        try {
            const response = await fetch('/api/user/achievements');
            const data = await response.json();

            if (data.success) {
                this.renderAchievements(data.achievements);
            }
        } catch (error) {
            console.error('Error loading achievements:', error);
            document.getElementById('achievementsList').innerHTML = '<p class="error">Error loading achievements</p>';
        }
    }

    renderAchievements(achievements) {
        const container = document.getElementById('achievementsList');
        
        if (!achievements || achievements.length === 0) {
            container.innerHTML = '<p class="no-data">No achievements available</p>';
            return;
        }

        let achievementsHTML = '';
        achievements.forEach(achievement => {
            const isEarned = achievement.earned_at !== null;
            achievementsHTML += `
                <div class="achievement-card ${isEarned ? 'earned' : ''}">
                    <div class="achievement-icon" style="color: ${isEarned ? '#d4af37' : '#666'}">
                        <i class="fas fa-${achievement.icon || 'trophy'}"></i>
                    </div>
                    <h4>${achievement.name}</h4>
                    <p>${achievement.description}</p>
                    ${isEarned ? 
                        `<p class="earned-date">Earned: ${new Date(achievement.earned_at).toLocaleDateString()}</p>` : 
                        '<p class="not-earned">Not earned yet</p>'
                    }
                </div>
            `;
        });
        
        container.innerHTML = achievementsHTML;
    }

    async loadSettings() {
        try {
            const response = await fetch('/api/user/preferences');
            const data = await response.json();

            if (data.success && data.preferences) {
                this.populatePreferences(data.preferences);
            }
        } catch (error) {
            console.error('Error loading settings:', error);
        }
    }

    populatePreferences(preferences) {
        const form = document.getElementById('preferencesForm');
        if (!form) return;

        Object.keys(preferences).forEach(key => {
            const element = form.querySelector(`[name="${key}"]`);
            if (element) {
                if (element.type === 'checkbox') {
                    element.checked = preferences[key];
                } else {
                    element.value = preferences[key];
                }
            }
        });
    }

    async savePreferences(e) {
        e.preventDefault();
        
        const formData = new FormData(e.target);
        const preferences = {};
        
        for (const [key, value] of formData.entries()) {
            preferences[key] = value;
        }
        
        // Handle checkbox
        preferences.auto_play_audio = document.getElementById('auto_play_audio').checked;
        
        try {
            const response = await fetch('/api/user/preferences', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify(preferences)
            });
            
            const data = await response.json();
            
            if (data.success) {
                this.showNotification('Preferences saved successfully!', 'success');
            } else {
                this.showNotification(data.message || 'Error saving preferences', 'error');
            }
        } catch (error) {
            console.error('Error saving preferences:', error);
            this.showNotification('Error saving preferences', 'error');
        }
    }

    async changePassword(e) {
        e.preventDefault();
        
        const formData = new FormData(e.target);
        const newPassword = formData.get('new_password');
        const confirmPassword = formData.get('confirm_new_password');
        
        if (newPassword !== confirmPassword) {
            this.showNotification('Passwords do not match', 'error');
            return;
        }
        
        try {
            const response = await fetch('/auth/change_password', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({
                    current_password: formData.get('current_password'),
                    new_password: newPassword
                })
            });
            
            const data = await response.json();
            
            if (data.success) {
                this.showNotification('Password changed successfully!', 'success');
                e.target.reset();
            } else {
                this.showNotification(data.message || 'Error changing password', 'error');
            }
        } catch (error) {
            console.error('Error changing password:', error);
            this.showNotification('Error changing password', 'error');
        }
    }

    showDeleteModal() {
        document.getElementById('deleteModal').style.display = 'block';
    }

    async deleteAccount(e) {
        e.preventDefault();
        
        const formData = new FormData(e.target);
        
        try {
            const response = await fetch('/auth/delete_account', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({
                    password: formData.get('password')
                })
            });
            
            const data = await response.json();
            
            if (data.success) {
                this.showNotification('Account deleted successfully', 'success');
                setTimeout(() => {
                    window.location.href = '/';
                }, 2000);
            } else {
                this.showNotification(data.message || 'Error deleting account', 'error');
            }
        } catch (error) {
            console.error('Error deleting account:', error);
            this.showNotification('Error deleting account', 'error');
        }
    }

    viewStory(storyId) {
        // Implement story viewing functionality
        window.open(`/story/${storyId}`, '_blank');
    }

    editStory(storyId) {
        // Implement story editing functionality
        window.location.href = `/edit/${storyId}`;
    }

    async deleteStory(storyId) {
        if (!confirm('Are you sure you want to delete this story?')) {
            return;
        }
        
        try {
            const response = await fetch(`/api/stories/${storyId}`, {
                method: 'DELETE'
            });
            
            const data = await response.json();
            
            if (data.success) {
                this.showNotification('Story deleted successfully', 'success');
                this.loadUserStories(); // Reload stories
            } else {
                this.showNotification(data.message || 'Error deleting story', 'error');
            }
        } catch (error) {
            console.error('Error deleting story:', error);
            this.showNotification('Error deleting story', 'error');
        }
    }

    renderStars(rating) {
        const fullStars = Math.floor(rating);
        const hasHalfStar = rating % 1 >= 0.5;
        const emptyStars = 5 - fullStars - (hasHalfStar ? 1 : 0);
        
        let starsHTML = '';
        
        for (let i = 0; i < fullStars; i++) {
            starsHTML += '<i class="fas fa-star"></i>';
        }
        
        if (hasHalfStar) {
            starsHTML += '<i class="fas fa-star-half-alt"></i>';
        }
        
        for (let i = 0; i < emptyStars; i++) {
            starsHTML += '<i class="far fa-star"></i>';
        }
        
        return starsHTML;
    }

    truncateText(text, maxLength) {
        if (text.length <= maxLength) return text;
        return text.substring(0, maxLength) + '...';
    }

    showNotification(message, type = 'success') {
        const notification = document.getElementById('notification');
        notification.textContent = message;
        notification.className = `notification ${type} show`;
        
        setTimeout(() => {
            notification.classList.remove('show');
        }, 3000);
    }
}

// Global functions for modal
function closeDeleteModal() {
    document.getElementById('deleteModal').style.display = 'none';
}

// Initialize profile manager when DOM is loaded
let profileManager;
document.addEventListener('DOMContentLoaded', () => {
    profileManager = new ProfileManager();
});

// Add CSS for era chart and other dynamic elements
const additionalCSS = `
.era-chart {
    display: flex;
    flex-direction: column;
    gap: 10px;
}

.era-bar {
    display: flex;
    align-items: center;
    gap: 10px;
}

.era-label {
    min-width: 120px;
    font-size: 0.9rem;
    color: rgba(255, 255, 255, 0.8);
}

.era-progress {
    flex: 1;
    height: 20px;
    background: rgba(255, 255, 255, 0.1);
    border-radius: 10px;
    overflow: hidden;
}

.era-fill {
    height: 100%;
    background: linear-gradient(90deg, #d4af37, #f1c40f);
    transition: width 0.3s ease;
}

.era-count {
    min-width: 30px;
    text-align: right;
    color: #d4af37;
    font-weight: 500;
}

.recent-story {
    padding: 15px;
    background: rgba(255, 255, 255, 0.05);
    border-radius: 8px;
    margin-bottom: 10px;
}

.recent-story h4 {
    color: #d4af37;
    margin-bottom: 5px;
}

.story-era {
    color: rgba(255, 255, 255, 0.7);
    font-size: 0.9rem;
    margin-bottom: 5px;
}

.story-date {
    color: rgba(255, 255, 255, 0.6);
    font-size: 0.8rem;
    margin-bottom: 10px;
}

.story-rating {
    display: flex;
    align-items: center;
    gap: 5px;
    color: #d4af37;
}

.story-rating span {
    color: rgba(255, 255, 255, 0.6);
    font-size: 0.9rem;
}

.story-excerpt {
    color: rgba(255, 255, 255, 0.8);
    line-height: 1.5;
    margin-bottom: 15px;
}

.story-meta {
    display: flex;
    justify-content: space-between;
    align-items: center;
    margin-bottom: 15px;
    padding-top: 10px;
    border-top: 1px solid rgba(255, 255, 255, 0.1);
}

.story-actions {
    display: flex;
    gap: 10px;
}

.story-actions .btn {
    padding: 5px 10px;
    font-size: 0.9rem;
}

.earned-date {
    color: #d4af37;
    font-size: 0.9rem;
    margin-top: 10px;
}

.not-earned {
    color: rgba(255, 255, 255, 0.5);
    font-size: 0.9rem;
    margin-top: 10px;
}

.checkbox-group {
    display: flex;
    align-items: center;
}

.checkbox-label {
    display: flex;
    align-items: center;
    cursor: pointer;
    color: rgba(255, 255, 255, 0.9);
}

.checkbox-label input[type="checkbox"] {
    margin-right: 10px;
}

.error {
    color: #e74c3c;
    text-align: center;
    padding: 20px;
}
`;

// Inject additional CSS
const style = document.createElement('style');
style.textContent = additionalCSS;
document.head.appendChild(style);
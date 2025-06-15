class EchoesOfTime {
    constructor() {
        this.currentEra = null;
        this.currentStory = null;
        this.currentCharacter = null;
        this.isGenerating = false;
        this.typewriterSpeed = 50;
        this.audioContext = null;
        this.currentAudio = null;
        this.userPreferences = {
            theme: 'dark',
            typewriter_speed: 'medium',
            auto_play_audio: false
        };
        this.init();
    }

    init() {
        this.bindEvents();
        this.initAnimations();
        this.loadUserPreferences();
        this.initAudioContext();
        this.checkAuthStatus();
    }

    async checkAuthStatus() {
        try {
            const response = await fetch('/api/user/status');
            const data = await response.json();
            
            if (data.authenticated) {
                this.showUserMenu(data.user);
            } else {
                this.showGuestMenu();
            }
        } catch (error) {
            console.log('Not authenticated');
            this.showGuestMenu();
        }
    }

    showUserMenu(user) {
        const authContainer = document.querySelector('.auth-container');
        if (authContainer) {
            authContainer.innerHTML = `
                <div class="user-menu">
                    <span class="welcome-text">Welcome, ${user.username}</span>
                    <div class="user-dropdown">
                        <button class="user-btn">
                            <i class="fas fa-user-circle"></i>
                            <i class="fas fa-chevron-down"></i>
                        </button>
                        <div class="dropdown-menu">
                            <a href="/auth/profile" class="dropdown-item">
                                <i class="fas fa-user"></i> Profile
                            </a>
                            <a href="/auth/logout" class="dropdown-item">
                                <i class="fas fa-sign-out-alt"></i> Logout
                            </a>
                        </div>
                    </div>
                </div>
            `;
            
            // Add dropdown functionality
            const userBtn = authContainer.querySelector('.user-btn');
            const dropdownMenu = authContainer.querySelector('.dropdown-menu');
            
            userBtn.addEventListener('click', () => {
                dropdownMenu.classList.toggle('show');
            });
            
            // Close dropdown when clicking outside
            document.addEventListener('click', (e) => {
                if (!authContainer.contains(e.target)) {
                    dropdownMenu.classList.remove('show');
                }
            });
        }
    }

    showGuestMenu() {
        const authContainer = document.querySelector('.auth-container');
        if (authContainer) {
            authContainer.innerHTML = `
                <div class="guest-menu">
                    <a href="/auth/login" class="auth-btn login-btn">
                        <i class="fas fa-sign-in-alt"></i> Login
                    </a>
                    <a href="/auth/register" class="auth-btn register-btn">
                        <i class="fas fa-user-plus"></i> Sign Up
                    </a>
                </div>
            `;
        }
    }

    async loadUserPreferences() {
        try {
            const response = await fetch('/api/user/preferences');
            const data = await response.json();
            
            if (data.success && data.preferences) {
                this.userPreferences = { ...this.userPreferences, ...data.preferences };
                this.applyPreferences();
            }
        } catch (error) {
            console.log('Using default preferences');
        }
    }

    applyPreferences() {
        // Apply theme
        document.body.setAttribute('data-theme', this.userPreferences.theme);
        
        // Apply typewriter speed
        const speedMap = { slow: 80, medium: 50, fast: 20 };
        this.typewriterSpeed = speedMap[this.userPreferences.typewriter_speed] || 50;
    }

    initAudioContext() {
        try {
            this.audioContext = new (window.AudioContext || window.webkitAudioContext)();
        } catch (error) {
            console.log('Audio context not supported');
        }
    }

    bindEvents() {
        // Era card selection
        document.querySelectorAll('.era-card').forEach(card => {
            card.addEventListener('click', () => {
                if (this.isGenerating) return;
                
                this.selectEra(card);
            });
        });

        // Story generation
        const generateBtn = document.getElementById('generate-story');
        if (generateBtn) {
            generateBtn.addEventListener('click', () => this.generateStory());
        }

        // Action buttons
        const saveBtn = document.getElementById('saveStory');
        const shareBtn = document.getElementById('shareStory');
        const bookmarkBtn = document.getElementById('bookmarkStory');
        const rateBtn = document.getElementById('rateStory');
        const newStoryBtn = document.getElementById('newStory');

        if (saveBtn) saveBtn.addEventListener('click', () => this.saveStory());
        if (shareBtn) shareBtn.addEventListener('click', () => this.shareStory());
        if (bookmarkBtn) bookmarkBtn.addEventListener('click', () => this.bookmarkStory());
        if (rateBtn) rateBtn.addEventListener('click', () => this.showRatingModal());
        if (newStoryBtn) newStoryBtn.addEventListener('click', () => this.resetForNewStory());

        // Settings button
        const settingsBtn = document.getElementById('settingsBtn');
        if (settingsBtn) {
            settingsBtn.addEventListener('click', () => this.showSettingsModal());
        }

        // Audio toggle
        const audioToggle = document.getElementById('audioToggle');
        if (audioToggle) {
            audioToggle.addEventListener('click', () => this.toggleAudio());
        }

        // Keyboard shortcuts
        document.addEventListener('keydown', (e) => {
            if (e.ctrlKey || e.metaKey) {
                switch (e.key) {
                    case 'Enter':
                        e.preventDefault();
                        if (!this.isGenerating && this.currentEra) {
                            this.generateStory();
                        }
                        break;
                    case 's':
                        e.preventDefault();
                        if (this.currentStory) {
                            this.saveStory();
                        }
                        break;
                    case 'n':
                        e.preventDefault();
                        this.resetForNewStory();
                        break;
                }
            }
        });
    }

    initAnimations() {
        // Intersection Observer for era cards
        const observer = new IntersectionObserver((entries) => {
            entries.forEach(entry => {
                if (entry.isIntersecting) {
                    entry.target.style.opacity = '1';
                    entry.target.style.transform = 'translateY(0)';
                }
            });
        }, {
            threshold: 0.1,
            rootMargin: '0px 0px -50px 0px'
        });

        document.querySelectorAll('.era-card').forEach(card => {
            card.style.opacity = '0';
            card.style.transform = 'translateY(30px)';
            card.style.transition = 'opacity 0.6s ease, transform 0.6s ease';
            observer.observe(card);
        });

        // Parallax effect for background
        window.addEventListener('scroll', () => {
            const scrolled = window.pageYOffset;
            const parallax = document.querySelector('.hero-section');
            if (parallax) {
                parallax.style.transform = `translateY(${scrolled * 0.5}px)`;
            }
        });
    }

    selectEra(card) {
        // Remove previous selection
        document.querySelectorAll('.era-card').forEach(c => {
            c.classList.remove('selected');
        });

        // Add selection to clicked card
        card.classList.add('selected');
        this.currentEra = card.dataset.era;

        // Show and enable generate button with animation
        const generateBtn = document.getElementById('generate-story');
        if (generateBtn) {
            generateBtn.disabled = false;
            generateBtn.style.display = 'block';
            generateBtn.style.opacity = '0';
            generateBtn.style.transform = 'translateY(20px)';
            
            setTimeout(() => {
                generateBtn.style.transition = 'all 0.3s ease';
                generateBtn.style.opacity = '1';
                generateBtn.style.transform = 'translateY(0)';
            }, 100);
        }

        // Play selection sound
        this.playSound('select');

        // Add visual feedback
        this.addRippleEffect(card);
    }

    addRippleEffect(element) {
        const ripple = document.createElement('div');
        ripple.className = 'ripple';
        element.appendChild(ripple);
        
        setTimeout(() => {
            ripple.remove();
        }, 600);
    }

    async generateStory() {
        if (!this.currentEra || this.isGenerating) return;

        this.isGenerating = true;
        this.showLoadingState();
        this.playSound('generate');

        try {
            const response = await fetch('/generate_diary', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({
                    era: this.currentEra,
                    save_story: true,
                    is_public: false
                })
            });

            const data = await response.json();

            if (data.error) {
                throw new Error(data.error);
            }

            this.currentStory = data;
            this.displayStory(data);
            this.trackAnalytics('story_generated', { era: this.currentEra });
            
        } catch (error) {
            console.error('Error generating story:', error);
            this.showError('Failed to generate story. Please try again.');
            this.playSound('error');
        } finally {
            this.isGenerating = false;
            this.hideLoadingState();
        }
    }

    showLoadingState() {
        const storyContainer = document.getElementById('storyContainer');
        if (storyContainer) {
            storyContainer.innerHTML = `
                <div class="loading-container">
                    <div class="loading-spinner"></div>
                    <div class="loading-text">
                        <h3>Crafting your story...</h3>
                        <p>Traveling through time to ${this.currentEra}</p>
                        <div class="loading-dots">
                            <span></span><span></span><span></span>
                        </div>
                    </div>
                </div>
            `;
            storyContainer.style.display = 'block';
        }
    }

    hideLoadingState() {
        // Loading state will be replaced by story content
    }

    async displayStory(data) {
        const storyContainer = document.getElementById('storyContainer');
        if (!storyContainer) return;

        // Show the story section
        const storySection = document.getElementById('story-section');
        if (storySection) {
            storySection.classList.remove('hidden');
        }

        // Create story HTML
        const storyHTML = `
            <div class="story-content">
                <div class="story-header">
                    <div class="era-badge">${data.era}</div>
                    <div class="story-meta">
                        <span class="story-date">${new Date(data.timestamp).toLocaleDateString()}</span>
                        <div class="story-actions-header">
                            <button id="audioToggle" class="action-btn" title="Toggle Audio">
                                <i class="fas fa-volume-up"></i>
                            </button>
                            <button id="settingsBtn" class="action-btn" title="Settings">
                                <i class="fas fa-cog"></i>
                            </button>
                        </div>
                    </div>
                </div>
                
                <div class="character-profile">
                    <div class="character-avatar">
                        <img src="${data.image_url}" alt="Character" class="character-image">
                    </div>
                    <div class="character-info">
                        <h3>${data.character_name}</h3>
                        <p class="character-role">Character from ${data.era}</p>
                        <p class="character-background">${data.character_profile}</p>
                    </div>
                </div>
                
                <div class="diary-entry">
                    <h2>Dear Diary...</h2>
                    <div id="diaryText" class="diary-text"></div>
                </div>
                
                <div class="historical-context">
                    <h3>Historical Context</h3>
                    <div class="context-content">
                        <p>${data.historical_context}</p>
                    </div>
                </div>
                
                <div class="story-actions">
                    <button id="saveStory" class="action-btn primary">
                        <i class="fas fa-save"></i> Save Story
                    </button>
                    <button id="shareStory" class="action-btn secondary">
                        <i class="fas fa-share"></i> Share
                    </button>
                    <button id="bookmarkStory" class="action-btn secondary">
                        <i class="fas fa-bookmark"></i> Bookmark
                    </button>
                    <button id="rateStory" class="action-btn secondary">
                        <i class="fas fa-star"></i> Rate
                    </button>
                    <button id="newStory" class="action-btn outline">
                        <i class="fas fa-plus"></i> New Story
                    </button>
                </div>
            </div>
        `;

        storyContainer.innerHTML = storyHTML;
        
        // Re-bind action button events
        this.bindActionButtons();
        
        // Start typewriter effect
        await this.typewriterEffect(data.diary_entry, document.getElementById('diaryText'));
        
        // Play ambient audio if enabled
        if (this.userPreferences.auto_play_audio) {
            this.playAmbientAudio(data.era);
        }
        
        // Scroll to story
        storyContainer.scrollIntoView({ behavior: 'smooth' });
    }

    bindActionButtons() {
        const saveBtn = document.getElementById('saveStory');
        const shareBtn = document.getElementById('shareStory');
        const bookmarkBtn = document.getElementById('bookmarkStory');
        const rateBtn = document.getElementById('rateStory');
        const newStoryBtn = document.getElementById('newStory');
        const audioToggle = document.getElementById('audioToggle');
        const settingsBtn = document.getElementById('settingsBtn');

        if (saveBtn) saveBtn.addEventListener('click', () => this.saveStory());
        if (shareBtn) shareBtn.addEventListener('click', () => this.shareStory());
        if (bookmarkBtn) bookmarkBtn.addEventListener('click', () => this.bookmarkStory());
        if (rateBtn) rateBtn.addEventListener('click', () => this.showRatingModal());
        if (newStoryBtn) newStoryBtn.addEventListener('click', () => this.resetForNewStory());
        if (audioToggle) audioToggle.addEventListener('click', () => this.toggleAudio());
        if (settingsBtn) settingsBtn.addEventListener('click', () => this.showSettingsModal());
    }

    async typewriterEffect(text, element) {
        element.innerHTML = '';
        let i = 0;
        
        return new Promise((resolve) => {
            const timer = setInterval(() => {
                if (i < text.length) {
                    element.innerHTML += text.charAt(i);
                    i++;
                    
                    // Play typing sound occasionally
                    if (i % 10 === 0) {
                        this.playSound('type');
                    }
                } else {
                    clearInterval(timer);
                    resolve();
                }
            }, this.typewriterSpeed);
        });
    }

    async saveStory() {
        if (!this.currentStory) return;
        
        try {
            const response = await fetch('/api/stories/save', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({
                    story_data: this.currentStory,
                    is_public: false
                })
            });
            
            const data = await response.json();
            
            if (data.success) {
                this.showNotification('Story saved successfully!', 'success');
                this.playSound('success');
            } else {
                throw new Error(data.message || 'Failed to save story');
            }
        } catch (error) {
            console.error('Error saving story:', error);
            this.showNotification('Please log in to save stories', 'info');
        }
    }

    async shareStory() {
        if (!this.currentStory) return;
        
        if (navigator.share) {
            try {
                await navigator.share({
                    title: `A story from ${this.currentStory.era}`,
                    text: this.currentStory.diary_entry.substring(0, 100) + '...',
                    url: window.location.href
                });
                this.trackAnalytics('story_shared', { era: this.currentStory.era });
            } catch (error) {
                console.log('Share cancelled');
            }
        } else {
            // Fallback: copy to clipboard
            const shareText = `Check out this story from ${this.currentStory.era}:\n\n${this.currentStory.diary_entry.substring(0, 200)}...\n\n${window.location.href}`;
            
            try {
                await navigator.clipboard.writeText(shareText);
                this.showNotification('Story link copied to clipboard!', 'success');
            } catch (error) {
                this.showNotification('Unable to share story', 'error');
            }
        }
    }

    async bookmarkStory() {
        if (!this.currentStory) return;
        
        try {
            const response = await fetch('/api/stories/bookmark', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({
                    story_data: this.currentStory
                })
            });
            
            const data = await response.json();
            
            if (data.success) {
                this.showNotification('Story bookmarked!', 'success');
                this.playSound('success');
            } else {
                throw new Error(data.message || 'Failed to bookmark story');
            }
        } catch (error) {
            console.error('Error bookmarking story:', error);
            this.showNotification('Please log in to bookmark stories', 'info');
        }
    }

    showRatingModal() {
        if (!this.currentStory) return;
        
        const modal = document.createElement('div');
        modal.className = 'modal rating-modal';
        modal.innerHTML = `
            <div class="modal-content">
                <div class="modal-header">
                    <h3>Rate this Story</h3>
                    <button class="close-btn" onclick="this.closest('.modal').remove()">
                        <i class="fas fa-times"></i>
                    </button>
                </div>
                <div class="modal-body">
                    <div class="rating-stars">
                        ${[1,2,3,4,5].map(i => `
                            <button class="star-btn" data-rating="${i}">
                                <i class="far fa-star"></i>
                            </button>
                        `).join('')}
                    </div>
                    <textarea id="ratingComment" placeholder="Share your thoughts about this story (optional)" rows="3"></textarea>
                </div>
                <div class="modal-footer">
                    <button class="btn secondary" onclick="this.closest('.modal').remove()">Cancel</button>
                    <button class="btn primary" onclick="echoesOfTime.submitRating()">Submit Rating</button>
                </div>
            </div>
        `;
        
        document.body.appendChild(modal);
        
        // Add star rating functionality
        const starBtns = modal.querySelectorAll('.star-btn');
        starBtns.forEach((btn, index) => {
            btn.addEventListener('click', () => {
                const rating = parseInt(btn.dataset.rating);
                this.selectedRating = rating;
                
                starBtns.forEach((star, i) => {
                    const icon = star.querySelector('i');
                    if (i < rating) {
                        icon.className = 'fas fa-star';
                        icon.style.color = '#d4af37';
                    } else {
                        icon.className = 'far fa-star';
                        icon.style.color = '';
                    }
                });
            });
        });
    }

    async submitRating() {
        if (!this.selectedRating) {
            this.showNotification('Please select a rating', 'error');
            return;
        }
        
        const comment = document.getElementById('ratingComment').value;
        
        try {
            const response = await fetch('/api/stories/rate', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({
                    story_data: this.currentStory,
                    rating: this.selectedRating,
                    comment: comment
                })
            });
            
            const data = await response.json();
            
            if (data.success) {
                this.showNotification('Thank you for your rating!', 'success');
                document.querySelector('.rating-modal').remove();
                this.playSound('success');
            } else {
                throw new Error(data.message || 'Failed to submit rating');
            }
        } catch (error) {
            console.error('Error submitting rating:', error);
            this.showNotification('Please log in to rate stories', 'info');
        }
    }

    showSettingsModal() {
        const modal = document.createElement('div');
        modal.className = 'modal settings-modal';
        modal.innerHTML = `
            <div class="modal-content">
                <div class="modal-header">
                    <h3>Settings</h3>
                    <button class="close-btn" onclick="this.closest('.modal').remove()">
                        <i class="fas fa-times"></i>
                    </button>
                </div>
                <div class="modal-body">
                    <div class="setting-group">
                        <label>Typewriter Speed</label>
                        <select id="typewriterSpeed">
                            <option value="slow" ${this.userPreferences.typewriter_speed === 'slow' ? 'selected' : ''}>Slow</option>
                            <option value="medium" ${this.userPreferences.typewriter_speed === 'medium' ? 'selected' : ''}>Medium</option>
                            <option value="fast" ${this.userPreferences.typewriter_speed === 'fast' ? 'selected' : ''}>Fast</option>
                        </select>
                    </div>
                    <div class="setting-group">
                        <label>
                            <input type="checkbox" id="autoPlayAudio" ${this.userPreferences.auto_play_audio ? 'checked' : ''}>
                            Auto-play ambient audio
                        </label>
                    </div>
                    <div class="setting-group">
                        <label>Theme</label>
                        <select id="themeSelect">
                            <option value="dark" ${this.userPreferences.theme === 'dark' ? 'selected' : ''}>Dark</option>
                            <option value="light" ${this.userPreferences.theme === 'light' ? 'selected' : ''}>Light</option>
                            <option value="auto" ${this.userPreferences.theme === 'auto' ? 'selected' : ''}>Auto</option>
                        </select>
                    </div>
                </div>
                <div class="modal-footer">
                    <button class="btn secondary" onclick="this.closest('.modal').remove()">Cancel</button>
                    <button class="btn primary" onclick="echoesOfTime.saveSettings()">Save Settings</button>
                </div>
            </div>
        `;
        
        document.body.appendChild(modal);
    }

    async saveSettings() {
        const typewriterSpeed = document.getElementById('typewriterSpeed').value;
        const autoPlayAudio = document.getElementById('autoPlayAudio').checked;
        const theme = document.getElementById('themeSelect').value;
        
        this.userPreferences = {
            typewriter_speed: typewriterSpeed,
            auto_play_audio: autoPlayAudio,
            theme: theme
        };
        
        this.applyPreferences();
        
        try {
            await fetch('/api/user/preferences', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify(this.userPreferences)
            });
            
            this.showNotification('Settings saved!', 'success');
        } catch (error) {
            console.log('Settings saved locally');
        }
        
        document.querySelector('.settings-modal').remove();
    }

    resetForNewStory() {
        this.currentStory = null;
        this.currentEra = null;
        
        // Clear selections
        document.querySelectorAll('.era-card').forEach(card => {
            card.classList.remove('selected');
        });
        
        // Hide story container
        const storyContainer = document.getElementById('storyContainer');
        if (storyContainer) {
            storyContainer.style.display = 'none';
        }
        
        // Hide generate button
        const generateBtn = document.getElementById('generateStory');
        if (generateBtn) {
            generateBtn.style.display = 'none';
        }
        
        // Stop audio
        this.stopAudio();
        
        // Scroll to top
        window.scrollTo({ top: 0, behavior: 'smooth' });
    }

    playAmbientAudio(era) {
        // This would play era-appropriate ambient sounds
        // For now, we'll just log the action
        console.log(`Playing ambient audio for ${era}`);
    }

    toggleAudio() {
        if (this.currentAudio) {
            this.stopAudio();
        } else {
            this.playAmbientAudio(this.currentStory?.era);
        }
    }

    stopAudio() {
        if (this.currentAudio) {
            this.currentAudio.pause();
            this.currentAudio = null;
        }
    }

    playSound(type) {
        if (!this.audioContext) return;
        
        // Simple sound generation for feedback
        const oscillator = this.audioContext.createOscillator();
        const gainNode = this.audioContext.createGain();
        
        oscillator.connect(gainNode);
        gainNode.connect(this.audioContext.destination);
        
        const frequencies = {
            select: 800,
            generate: 600,
            success: 1000,
            error: 300,
            type: 1200
        };
        
        oscillator.frequency.setValueAtTime(frequencies[type] || 600, this.audioContext.currentTime);
        gainNode.gain.setValueAtTime(0.1, this.audioContext.currentTime);
        gainNode.gain.exponentialRampToValueAtTime(0.01, this.audioContext.currentTime + 0.1);
        
        oscillator.start(this.audioContext.currentTime);
        oscillator.stop(this.audioContext.currentTime + 0.1);
    }

    showError(message) {
        this.showNotification(message, 'error');
    }

    showNotification(message, type = 'info') {
        const notification = document.createElement('div');
        notification.className = `notification ${type}`;
        notification.textContent = message;
        
        document.body.appendChild(notification);
        
        setTimeout(() => {
            notification.classList.add('show');
        }, 100);
        
        setTimeout(() => {
            notification.classList.remove('show');
            setTimeout(() => {
                notification.remove();
            }, 300);
        }, 3000);
    }

    async trackAnalytics(event, data = {}) {
        try {
            await fetch('/api/analytics/track', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({
                    event: event,
                    data: data,
                    timestamp: new Date().toISOString()
                })
            });
        } catch (error) {
            console.log('Analytics tracking failed:', error);
        }
    }
}

// Initialize the application
let echoesOfTime;
document.addEventListener('DOMContentLoaded', () => {
    echoesOfTime = new EchoesOfTime();
});

// Add additional CSS for new features
const additionalCSS = `
.auth-container {
    position: fixed;
    top: 20px;
    right: 20px;
    z-index: 1000;
}

.user-menu {
    display: flex;
    align-items: center;
    gap: 15px;
}

.welcome-text {
    color: rgba(255, 255, 255, 0.9);
    font-size: 0.9rem;
}

.user-dropdown {
    position: relative;
}

.user-btn {
    background: rgba(255, 255, 255, 0.1);
    border: 1px solid rgba(255, 255, 255, 0.2);
    border-radius: 25px;
    padding: 8px 15px;
    color: white;
    cursor: pointer;
    display: flex;
    align-items: center;
    gap: 8px;
    transition: all 0.3s ease;
}

.user-btn:hover {
    background: rgba(255, 255, 255, 0.2);
}

.dropdown-menu {
    position: absolute;
    top: 100%;
    right: 0;
    background: #1a1a2e;
    border: 1px solid rgba(255, 255, 255, 0.2);
    border-radius: 8px;
    min-width: 150px;
    opacity: 0;
    visibility: hidden;
    transform: translateY(-10px);
    transition: all 0.3s ease;
    margin-top: 5px;
}

.dropdown-menu.show {
    opacity: 1;
    visibility: visible;
    transform: translateY(0);
}

.dropdown-item {
    display: flex;
    align-items: center;
    gap: 10px;
    padding: 12px 15px;
    color: rgba(255, 255, 255, 0.9);
    text-decoration: none;
    transition: background 0.3s ease;
}

.dropdown-item:hover {
    background: rgba(255, 255, 255, 0.1);
}

.guest-menu {
    display: flex;
    gap: 10px;
}

.auth-btn {
    padding: 8px 16px;
    border-radius: 20px;
    text-decoration: none;
    font-size: 0.9rem;
    transition: all 0.3s ease;
    display: flex;
    align-items: center;
    gap: 5px;
}

.login-btn {
    background: transparent;
    border: 1px solid rgba(255, 255, 255, 0.3);
    color: rgba(255, 255, 255, 0.9);
}

.login-btn:hover {
    background: rgba(255, 255, 255, 0.1);
}

.register-btn {
    background: #d4af37;
    color: #1a1a2e;
    border: 1px solid #d4af37;
}

.register-btn:hover {
    background: #f1c40f;
}

.loading-container {
    display: flex;
    flex-direction: column;
    align-items: center;
    padding: 60px 20px;
    text-align: center;
}

.loading-spinner {
    width: 60px;
    height: 60px;
    border: 3px solid rgba(212, 175, 55, 0.3);
    border-top: 3px solid #d4af37;
    border-radius: 50%;
    animation: spin 1s linear infinite;
    margin-bottom: 20px;
}

@keyframes spin {
    0% { transform: rotate(0deg); }
    100% { transform: rotate(360deg); }
}

.loading-text h3 {
    color: #d4af37;
    margin-bottom: 10px;
}

.loading-text p {
    color: rgba(255, 255, 255, 0.7);
    margin-bottom: 20px;
}

.loading-dots {
    display: flex;
    gap: 5px;
}

.loading-dots span {
    width: 8px;
    height: 8px;
    background: #d4af37;
    border-radius: 50%;
    animation: bounce 1.4s ease-in-out infinite both;
}

.loading-dots span:nth-child(1) { animation-delay: -0.32s; }
.loading-dots span:nth-child(2) { animation-delay: -0.16s; }

@keyframes bounce {
    0%, 80%, 100% {
        transform: scale(0);
    }
    40% {
        transform: scale(1);
    }
}

.story-header {
    display: flex;
    justify-content: space-between;
    align-items: center;
    margin-bottom: 20px;
}

.era-badge {
    background: linear-gradient(135deg, #d4af37, #f1c40f);
    color: #1a1a2e;
    padding: 8px 16px;
    border-radius: 20px;
    font-weight: 600;
    font-size: 0.9rem;
}

.story-meta {
    display: flex;
    align-items: center;
    gap: 15px;
}

.story-date {
    color: rgba(255, 255, 255, 0.7);
    font-size: 0.9rem;
}

.story-actions-header {
    display: flex;
    gap: 10px;
}

.character-profile {
    display: flex;
    gap: 20px;
    background: rgba(255, 255, 255, 0.05);
    padding: 20px;
    border-radius: 15px;
    margin-bottom: 30px;
    backdrop-filter: blur(10px);
}

.character-avatar {
    flex-shrink: 0;
}

.character-image {
    width: 80px;
    height: 80px;
    border-radius: 50%;
    object-fit: cover;
    border: 3px solid #d4af37;
}

.character-info h3 {
    color: #d4af37;
    margin-bottom: 5px;
}

.character-role {
    color: rgba(255, 255, 255, 0.8);
    font-style: italic;
    margin-bottom: 10px;
}

.character-background {
    color: rgba(255, 255, 255, 0.7);
    line-height: 1.5;
}

.diary-entry {
    background: rgba(255, 255, 255, 0.03);
    padding: 30px;
    border-radius: 15px;
    margin-bottom: 30px;
    border-left: 4px solid #d4af37;
}

.diary-entry h2 {
    color: #d4af37;
    font-family: 'Playfair Display', serif;
    margin-bottom: 20px;
    font-size: 1.8rem;
}

.diary-text {
    color: rgba(255, 255, 255, 0.9);
    line-height: 1.8;
    font-size: 1.1rem;
    font-family: 'Georgia', serif;
}

.historical-context {
    background: rgba(255, 255, 255, 0.05);
    padding: 20px;
    border-radius: 15px;
    margin-bottom: 30px;
}

.historical-context h3 {
    color: #d4af37;
    margin-bottom: 15px;
}

.context-content p {
    color: rgba(255, 255, 255, 0.8);
    line-height: 1.6;
}

.story-actions {
    display: flex;
    gap: 15px;
    justify-content: center;
    flex-wrap: wrap;
}

.action-btn {
    padding: 12px 20px;
    border: none;
    border-radius: 25px;
    cursor: pointer;
    font-weight: 500;
    transition: all 0.3s ease;
    display: flex;
    align-items: center;
    gap: 8px;
    text-decoration: none;
}

.action-btn.primary {
    background: linear-gradient(135deg, #d4af37, #f1c40f);
    color: #1a1a2e;
}

.action-btn.primary:hover {
    transform: translateY(-2px);
    box-shadow: 0 5px 15px rgba(212, 175, 55, 0.4);
}

.action-btn.secondary {
    background: rgba(255, 255, 255, 0.1);
    color: white;
    border: 1px solid rgba(255, 255, 255, 0.2);
}

.action-btn.secondary:hover {
    background: rgba(255, 255, 255, 0.2);
    transform: translateY(-2px);
}

.action-btn.outline {
    background: transparent;
    color: #d4af37;
    border: 2px solid #d4af37;
}

.action-btn.outline:hover {
    background: #d4af37;
    color: #1a1a2e;
    transform: translateY(-2px);
}

.modal {
    position: fixed;
    top: 0;
    left: 0;
    width: 100%;
    height: 100%;
    background: rgba(0, 0, 0, 0.8);
    display: flex;
    align-items: center;
    justify-content: center;
    z-index: 2000;
    backdrop-filter: blur(5px);
}

.modal-content {
    background: #1a1a2e;
    border-radius: 15px;
    max-width: 500px;
    width: 90%;
    max-height: 80vh;
    overflow-y: auto;
    border: 1px solid rgba(255, 255, 255, 0.1);
}

.modal-header {
    display: flex;
    justify-content: space-between;
    align-items: center;
    padding: 20px;
    border-bottom: 1px solid rgba(255, 255, 255, 0.1);
}

.modal-header h3 {
    color: #d4af37;
    margin: 0;
}

.close-btn {
    background: none;
    border: none;
    color: rgba(255, 255, 255, 0.7);
    font-size: 1.2rem;
    cursor: pointer;
    padding: 5px;
    border-radius: 50%;
    transition: all 0.3s ease;
}

.close-btn:hover {
    background: rgba(255, 255, 255, 0.1);
    color: white;
}

.modal-body {
    padding: 20px;
}

.modal-footer {
    display: flex;
    gap: 10px;
    justify-content: flex-end;
    padding: 20px;
    border-top: 1px solid rgba(255, 255, 255, 0.1);
}

.rating-stars {
    display: flex;
    gap: 10px;
    justify-content: center;
    margin-bottom: 20px;
}

.star-btn {
    background: none;
    border: none;
    font-size: 2rem;
    color: rgba(255, 255, 255, 0.3);
    cursor: pointer;
    transition: all 0.3s ease;
}

.star-btn:hover {
    color: #d4af37;
    transform: scale(1.1);
}

.setting-group {
    margin-bottom: 20px;
}

.setting-group label {
    display: block;
    color: rgba(255, 255, 255, 0.9);
    margin-bottom: 8px;
    font-weight: 500;
}

.setting-group select,
.setting-group textarea {
    width: 100%;
    padding: 10px;
    background: rgba(255, 255, 255, 0.1);
    border: 1px solid rgba(255, 255, 255, 0.2);
    border-radius: 8px;
    color: white;
    font-family: inherit;
}

.setting-group textarea {
    resize: vertical;
    min-height: 80px;
}

.notification {
    position: fixed;
    top: 20px;
    right: 20px;
    padding: 15px 20px;
    border-radius: 8px;
    color: white;
    font-weight: 500;
    transform: translateX(400px);
    transition: transform 0.3s ease;
    z-index: 3000;
    max-width: 300px;
}

.notification.show {
    transform: translateX(0);
}

.notification.success {
    background: linear-gradient(135deg, #27ae60, #2ecc71);
}

.notification.error {
    background: linear-gradient(135deg, #e74c3c, #c0392b);
}

.notification.info {
    background: linear-gradient(135deg, #3498db, #2980b9);
}

.ripple {
    position: absolute;
    border-radius: 50%;
    background: rgba(212, 175, 55, 0.6);
    transform: scale(0);
    animation: ripple-animation 0.6s linear;
    pointer-events: none;
    top: 50%;
    left: 50%;
    width: 100px;
    height: 100px;
    margin-top: -50px;
    margin-left: -50px;
}

@keyframes ripple-animation {
    to {
        transform: scale(4);
        opacity: 0;
    }
}

.era-card {
    position: relative;
    overflow: hidden;
}

.era-card.selected {
    transform: scale(1.05);
    box-shadow: 0 10px 30px rgba(212, 175, 55, 0.3);
}

@media (max-width: 768px) {
    .auth-container {
        position: relative;
        top: auto;
        right: auto;
        margin-bottom: 20px;
    }
    
    .character-profile {
        flex-direction: column;
        text-align: center;
    }
    
    .story-actions {
        flex-direction: column;
        align-items: center;
    }
    
    .action-btn {
        width: 100%;
        max-width: 200px;
        justify-content: center;
    }
    
    .modal-content {
        width: 95%;
        margin: 10px;
    }
}
`;

// Inject additional CSS
const style = document.createElement('style');
style.textContent = additionalCSS;
document.head.appendChild(style);
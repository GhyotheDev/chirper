document.addEventListener('DOMContentLoaded', function() {
    // DOM Elements
    const chirpBtn = document.querySelector('.chirp-btn:not(.small)');
    const chirpModal = document.getElementById('chirp-modal');
    const closeModalBtn = document.querySelector('.close-modal');
    const smallChirpBtns = document.querySelectorAll('.chirp-btn.small');
    const composeInputs = document.querySelectorAll('.compose-input');
    const actionBtns = document.querySelectorAll('.action-btn');
    const followBtns = document.querySelectorAll('.follow-btn');
    const tabs = document.querySelectorAll('.tab');
    
    // Open chirp modal
    if (chirpBtn) {
        chirpBtn.addEventListener('click', function() {
            chirpModal.style.display = 'flex';
            document.body.style.overflow = 'hidden';
            
            // Focus on the textarea
            const modalTextarea = chirpModal.querySelector('.compose-input');
            if (modalTextarea) {
                modalTextarea.focus();
            }
        });
    }
    
    // Close chirp modal
    if (closeModalBtn) {
        closeModalBtn.addEventListener('click', function() {
            chirpModal.style.display = 'none';
            document.body.style.overflow = '';
        });
    }
    
    // Close modal when clicking outside
    window.addEventListener('click', function(event) {
        if (event.target === chirpModal) {
            chirpModal.style.display = 'none';
            document.body.style.overflow = '';
        }
    });
    
    // Handle small chirp buttons (post chirp)
    smallChirpBtns.forEach(btn => {
        btn.addEventListener('click', function() {
            const composeContainer = this.closest('.compose-chirp');
            const textarea = composeContainer.querySelector('.compose-input');
            
            if (textarea.value.trim() !== '') {
                // In a real app, this would send the chirp to a server
                // For this demo, we'll just clear the textarea and show a notification
                alert('Your chirp was sent! (This is a demo app)');
                textarea.value = '';
                
                // Close modal if we're in the modal
                if (this.closest('.modal')) {
                    chirpModal.style.display = 'none';
                    document.body.style.overflow = '';
                }
            } else {
                alert('Please enter some text for your chirp');
            }
        });
    });
    
    // Auto-resize textareas as user types
    composeInputs.forEach(input => {
        input.addEventListener('input', function() {
            this.style.height = 'auto';
            this.style.height = (this.scrollHeight) + 'px';
        });
    });
    
    // Handle action buttons (like, retweet, etc.)
    actionBtns.forEach(btn => {
        btn.addEventListener('click', function() {
            const icon = this.querySelector('i');
            const countSpan = this.querySelector('span');
            
            // Toggle filled/outline icons
            if (icon.classList.contains('far')) {
                icon.classList.remove('far');
                icon.classList.add('fas');
                
                // Increment count if there is a count span
                if (countSpan) {
                    let count = parseInt(countSpan.textContent);
                    countSpan.textContent = (count + 1).toString();
                }
            } else {
                icon.classList.remove('fas');
                icon.classList.add('far');
                
                // Decrement count if there is a count span
                if (countSpan) {
                    let count = parseInt(countSpan.textContent);
                    countSpan.textContent = (count - 1).toString();
                }
            }
        });
    });
    
    // Handle follow buttons
    followBtns.forEach(btn => {
        btn.addEventListener('click', function(e) {
            e.stopPropagation(); // Prevent triggering the parent click event
            
            if (this.textContent === 'Follow') {
                this.textContent = 'Following';
                this.style.backgroundColor = 'transparent';
                this.style.color = 'var(--text-color)';
                this.style.border = '1px solid var(--border-color)';
            } else {
                this.textContent = 'Follow';
                this.style.backgroundColor = 'var(--text-color)';
                this.style.color = 'white';
                this.style.border = 'none';
            }
        });
    });
    
    // Handle tabs
    tabs.forEach(tab => {
        tab.addEventListener('click', function() {
            // Remove active class from all tabs
            tabs.forEach(t => t.classList.remove('active'));
            
            // Add active class to clicked tab
            this.classList.add('active');
        });
    });
    
    // Create placeholder images for missing images
    createPlaceholderImages();
});

// Function to create placeholder images for missing images
function createPlaceholderImages() {
    const images = document.querySelectorAll('img');
    
    images.forEach(img => {
        img.onerror = function() {
            // For profile images
            if (this.classList.contains('profile-img')) {
                const name = this.alt || 'User';
                this.src = `https://ui-avatars.com/api/?name=${name.replace(/\s+/g, '+')}&background=random`;
            }
            // For chirp images
            else if (this.closest('.chirp-image')) {
                this.src = 'data:image/svg+xml;utf8,<svg xmlns="http://www.w3.org/2000/svg" width="600" height="300" viewBox="0 0 600 300"><rect width="600" height="300" fill="%23f8f9fa"/><text x="300" y="150" font-size="24" text-anchor="middle" fill="%23536471">Image not available</text></svg>';
            }
        };
    });
}
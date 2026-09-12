// PrepPilot Main JavaScript

document.addEventListener('DOMContentLoaded', function() {
    // Initialize tooltips
    var tooltipTriggerList = [].slice.call(document.querySelectorAll('[data-bs-toggle="tooltip"]'));
    tooltipTriggerList.map(function(tooltipTriggerEl) {
        return new bootstrap.Tooltip(tooltipTriggerEl);
    });
    
    // Initialize popovers
    var popoverTriggerList = [].slice.call(document.querySelectorAll('[data-bs-toggle="popover"]'));
    popoverTriggerList.map(function(popoverTriggerEl) {
        return new bootstrap.Popover(popoverTriggerEl);
    });
    
    // Auto-dismiss alerts after 5 seconds
    setTimeout(function() {
        var alerts = document.querySelectorAll('.alert-dismissible');
        alerts.forEach(function(alert) {
            var bsAlert = new bootstrap.Alert(alert);
            bsAlert.close();
        });
    }, 5000);
    
    // Confirm delete buttons
    document.querySelectorAll('[data-confirm-delete]').forEach(function(btn) {
        btn.addEventListener('click', function(e) {
            if (!confirm(this.dataset.confirmDelete || 'Are you sure you want to delete this?')) {
                e.preventDefault();
            }
        });
    });
    
    // Study block actions
    document.addEventListener('click', function(e) {
        // Start block
        if (e.target.closest('.start-block')) {
            var btn = e.target.closest('.start-block');
            var blockId = btn.dataset.blockId;
            startStudyBlock(blockId, btn);
        }
        
        // Complete block
        if (e.target.closest('.complete-block')) {
            var btn = e.target.closest('.complete-block');
            var blockId = btn.dataset.blockId;
            completeStudyBlock(blockId, btn);
        }
    });
    
    // Form validation enhancement
    document.querySelectorAll('form.needs-validation').forEach(function(form) {
        form.addEventListener('submit', function(event) {
            if (!form.checkValidity()) {
                event.preventDefault();
                event.stopPropagation();
            }
            form.classList.add('was-validated');
        });
    });
    
    // Smooth scroll for anchor links
    document.querySelectorAll('a[href^="#"]').forEach(function(anchor) {
        anchor.addEventListener('click', function(e) {
            var targetId = this.getAttribute('href');
            if (targetId === '#') return;
            
            var target = document.querySelector(targetId);
            if (target) {
                e.preventDefault();
                target.scrollIntoView({ behavior: 'smooth', block: 'start' });
            }
        });
    });
    
    // Copy to clipboard buttons
    document.querySelectorAll('[data-copy]').forEach(function(btn) {
        btn.addEventListener('click', function() {
            var text = this.dataset.copy;
            navigator.clipboard.writeText(text).then(function() {
                showToast('Copied to clipboard!', 'success');
            }).catch(function() {
                showToast('Failed to copy', 'danger');
            });
        });
    });
    
    // Loading states for buttons
    document.querySelectorAll('form[data-loading]').forEach(function(form) {
        form.addEventListener('submit', function() {
            var submitBtn = form.querySelector('button[type="submit"]');
            if (submitBtn) {
                submitBtn.disabled = true;
                submitBtn.innerHTML = '<span class="spinner me-2"></span>Processing...';
            }
        });
    });
});

// Study block functions
function startStudyBlock(blockId, btn) {
    btn.disabled = true;
    btn.innerHTML = '<span class="spinner me-2"></span>Starting...';
    
    fetch('/api/v1/study/plans/blocks/' + blockId + '/start/', {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
            'X-CSRFToken': getCsrfToken(),
        },
        credentials: 'same-origin'
    })
    .then(response => response.json())
    .then(data => {
        if (data.status === 'in_progress') {
            btn.outerHTML = '<span class="text-primary"><i class="bi bi-play-circle-fill"></i> In Progress</span>';
            showToast('Study block started!', 'success');
            // Refresh page after short delay to update UI
            setTimeout(() => location.reload(), 1000);
        } else {
            showToast(data.detail || 'Failed to start block', 'danger');
            btn.disabled = false;
            btn.innerHTML = '<i class="bi bi-play-fill"></i> Start';
        }
    })
    .catch(error => {
        console.error('Error:', error);
        showToast('An error occurred', 'danger');
        btn.disabled = false;
        btn.innerHTML = '<i class="bi bi-play-fill"></i> Start';
    });
}

function completeStudyBlock(blockId, btn) {
    var actualDuration = prompt('How many minutes did you actually spend?', '60');
    if (actualDuration === null) return; // User cancelled
    
    var notes = prompt('Any notes? (optional)', '') || '';
    
    btn.disabled = true;
    btn.innerHTML = '<span class="spinner me-2"></span>Completing...';
    
    fetch('/api/v1/study/plans/blocks/' + blockId + '/complete/', {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
            'X-CSRFToken': getCsrfToken(),
        },
        body: JSON.stringify({
            actual_duration: parseInt(actualDuration) || 0,
            notes: notes
        }),
        credentials: 'same-origin'
    })
    .then(response => response.json())
    .then(data => {
        if (data.status === 'completed') {
            btn.outerHTML = '<span class="text-success"><i class="bi bi-check-circle-fill"></i> Done</span>';
            showToast('Study block completed! Great job!', 'success');
            setTimeout(() => location.reload(), 1000);
        } else {
            showToast(data.detail || 'Failed to complete block', 'danger');
            btn.disabled = false;
            btn.innerHTML = '<i class="bi bi-check-circle-fill"></i> Complete';
        }
    })
    .catch(error => {
        console.error('Error:', error);
        showToast('An error occurred', 'danger');
        btn.disabled = false;
        btn.innerHTML = '<i class="bi bi-check-circle-fill"></i> Complete';
    });
}

// Toast notifications
function showToast(message, type = 'info') {
    var container = document.getElementById('toast-container');
    if (!container) {
        container = document.createElement('div');
        container.id = 'toast-container';
        container.className = 'toast-container position-fixed bottom-0 end-0 p-3';
        container.style.zIndex = '9999';
        document.body.appendChild(container);
    }
    
    var toast = document.createElement('div');
    toast.className = 'toast align-items-center text-white bg-' + type + ' border-0';
    toast.setAttribute('role', 'alert');
    toast.setAttribute('aria-live', 'assertive');
    toast.setAttribute('aria-atomic', 'true');
    toast.innerHTML = 
        '<div class="d-flex">' +
        '  <div class="toast-body">' + message + '</div>' +
        '  <button type="button" class="btn-close btn-close-white me-2 m-auto" data-bs-dismiss="toast"></button>' +
        '</div>';
    
    container.appendChild(toast);
    var bsToast = new bootstrap.Toast(toast, { delay: 3000 });
    bsToast.show();
    
    toast.addEventListener('hidden.bs.toast', function() {
        toast.remove();
    });
}

// Get CSRF token
function getCsrfToken() {
    var cookieValue = null;
    if (document.cookie && document.cookie !== '') {
        var cookies = document.cookie.split(';');
        for (var i = 0; i < cookies.length; i++) {
            var cookie = cookies[i].trim();
            if (cookie.substring(0, 10) === 'csrftoken=') {
                cookieValue = decodeURIComponent(cookie.substring(10));
                break;
            }
        }
    }
    return cookieValue;
}

// API helper functions
const api = {
    get: function(url) {
        return fetch(url, {
            headers: { 'Content-Type': 'application/json' },
            credentials: 'same-origin'
        }).then(r => r.json());
    },
    
    post: function(url, data) {
        return fetch(url, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'X-CSRFToken': getCsrfToken(),
            },
            body: JSON.stringify(data),
            credentials: 'same-origin'
        }).then(r => r.json());
    },
    
    put: function(url, data) {
        return fetch(url, {
            method: 'PUT',
            headers: {
                'Content-Type': 'application/json',
                'X-CSRFToken': getCsrfToken(),
            },
            body: JSON.stringify(data),
            credentials: 'same-origin'
        }).then(r => r.json());
    },
    
    patch: function(url, data) {
        return fetch(url, {
            method: 'PATCH',
            headers: {
                'Content-Type': 'application/json',
                'X-CSRFToken': getCsrfToken(),
            },
            body: JSON.stringify(data),
            credentials: 'same-origin'
        }).then(r => r.json());
    },
    
    delete: function(url) {
        return fetch(url, {
            method: 'DELETE',
            headers: { 'X-CSRFToken': getCsrfToken() },
            credentials: 'same-origin'
        });
    }
};

// Debounce function
function debounce(func, wait) {
    let timeout;
    return function(...args) {
        clearTimeout(timeout);
        timeout = setTimeout(() => func.apply(this, args), wait);
    };
}

// Format duration
function formatDuration(minutes) {
    if (minutes < 60) return minutes + ' min';
    var hours = Math.floor(minutes / 60);
    var mins = minutes % 60;
    return hours + 'h ' + (mins > 0 ? mins + 'm' : '');
}

// Format date
function formatDate(dateStr) {
    var date = new Date(dateStr);
    return date.toLocaleDateString('en-US', {
        weekday: 'short',
        month: 'short',
        day: 'numeric'
    });
}

// Export for use in other scripts
window.PrepPilot = {
    api: api,
    showToast: showToast,
    formatDuration: formatDuration,
    formatDate: formatDate,
    debounce: debounce,
    getCsrfToken: getCsrfToken
};
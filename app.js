// Global variables
let currentProjectId = null;
let selectedTags = new Set();

// DOM Elements
document.addEventListener('DOMContentLoaded', () => {
    initializeApp();
});

function initializeApp() {
    // Theme toggle
    initializeTheme();
    
    // Navigation
    initializeNavigation();
    
    // Tags selector
    initializeTagsSelector();
    
    // Form handling
    initializeProjectForm();
    
    // Search and filters
    initializeSearchAndFilters();
    
    // Load projects
    loadProjects();
    
    // Modal close buttons
    initializeModals();
}

// Theme functions
function initializeTheme() {
    const themeSwitch = document.getElementById('themeSwitch');
    
    // Check for saved theme preference
    const savedTheme = localStorage.getItem('theme') || 'light';
    document.body.className = savedTheme === 'dark' ? 'dark-mode' : 'light-mode';
    themeSwitch.checked = savedTheme === 'dark';
    
    themeSwitch.addEventListener('change', () => {
        if (themeSwitch.checked) {
            document.body.className = 'dark-mode';
            localStorage.setItem('theme', 'dark');
        } else {
            document.body.className = 'light-mode';
            localStorage.setItem('theme', 'light');
        }
    });
}

// Navigation
function initializeNavigation() {
    const navButtons = document.querySelectorAll('.nav-btn');
    
    navButtons.forEach(btn => {
        btn.addEventListener('click', () => {
            // Remove active class from all buttons and tabs
            navButtons.forEach(b => b.classList.remove('active'));
            document.querySelectorAll('.tab-content').forEach(t => t.classList.remove('active'));
            
            // Add active class to clicked button and corresponding tab
            btn.classList.add('active');
            const tabId = btn.dataset.tab;
            document.getElementById(tabId).classList.add('active');
        });
    });
}

// Tags selector
function initializeTagsSelector() {
    const tagsSelector = document.getElementById('tagsSelector');
    
    AVAILABLE_TAGS.forEach(tag => {
        const tagElement = document.createElement('span');
        tagElement.className = 'tag-option';
        tagElement.textContent = tag;
        tagElement.addEventListener('click', () => toggleTag(tag, tagElement));
        tagsSelector.appendChild(tagElement);
    });
}

function toggleTag(tag, element) {
    if (selectedTags.has(tag)) {
        selectedTags.delete(tag);
        element.classList.remove('selected');
    } else {
        if (selectedTags.size < 5) {
            selectedTags.add(tag);
            element.classList.add('selected');
        } else {
            showNotification('You can only select up to 5 tags', 'warning');
        }
    }
    document.getElementById('tagCount').textContent = `${selectedTags.size}/5 selected`;
}

// Project form
function initializeProjectForm() {
    const form = document.getElementById('projectForm');
    
    // Description counter
    const descInput = document.getElementById('projectDescription');
    descInput.addEventListener('input', () => {
        document.getElementById('descCount').textContent = descInput.value.length;
    });
    
    form.addEventListener('submit', async (e) => {
        e.preventDefault();
        
        if (!currentUser) {
            showNotification('Please login to share a project', 'warning');
            showAuthModal();
            return;
        }
        
        const projectData = {
            name: document.getElementById('projectName').value,
            description: document.getElementById('projectDescription').value,
            link: document.getElementById('projectLink').value,
            tags: Array.from(selectedTags),
            userId: currentUser.uid,
            userName: currentUser.displayName || currentUser.email.split('@')[0],
            createdAt: firebase.firestore.FieldValue.serverTimestamp(),
            upvotes: 0,
            downvotes: 0,
            comments: 0
        };
        
        try {
            await db.collection('projects').add(projectData);
            showNotification('Project shared successfully!', 'success');
            form.reset();
            selectedTags.clear();
            document.querySelectorAll('.tag-option').forEach(t => t.classList.remove('selected'));
            document.getElementById('tagCount').textContent = '0/5 selected';
            document.getElementById('descCount').textContent = '0';
            
            // Switch to dashboard
            document.querySelector('[data-tab="dashboard"]').click();
        } catch (error) {
            showNotification(error.message, 'error');
        }
    });
}

// Load and display projects
function loadProjects() {
    const projectsGrid = document.getElementById('projectsGrid');
    let query = db.collection('projects');
    
    // Apply sorting
    const sortBy = document.getElementById('sortSelect')?.value || 'newest';
    switch(sortBy) {
        case 'newest':
            query = query.orderBy('createdAt', 'desc');
            break;
        case 'oldest':
            query = query.orderBy('createdAt', 'asc');
            break;
        case 'mostUpvoted':
            query = query.orderBy('upvotes', 'desc');
            break;
        case 'mostDownvoted':
            query = query.orderBy('downvotes', 'desc');
            break;
    }
    
    projectsGrid.innerHTML = '<div class="loading"><i class="fas fa-spinner"></i> Loading projects...</div>';
    
    query.onSnapshot((snapshot) => {
        let projects = [];
        snapshot.forEach(doc => {
            projects.push({ id: doc.id, ...doc.data() });
        });
        
        // Apply category filter
        const categoryFilter = document.getElementById('categoryFilter')?.value;
        if (categoryFilter && categoryFilter !== 'all') {
            projects = projects.filter(p => p.tags && p.tags.includes(categoryFilter));
        }
        
        // Apply search filter
        const searchTerm = document.getElementById('searchInput')?.value?.toLowerCase();
        if (searchTerm) {
            projects = projects.filter(p => 
                p.name?.toLowerCase().includes(searchTerm) ||
                p.description?.toLowerCase().includes(searchTerm) ||
                p.userName?.toLowerCase().includes(searchTerm)
            );
        }
        
        displayProjects(projects);
    });
}

function displayProjects(projects) {
    const projectsGrid = document.getElementById('projectsGrid');
    
    if (projects.length === 0) {
        projectsGrid.innerHTML = '<div class="loading">No projects found. Be the first to share one!</div>';
        return;
    }
    
    projectsGrid.innerHTML = projects.map(project => `
        <div class="project-card" onclick="openProjectModal('${project.id}')">
            <div class="project-actions">
                ${currentUser && project.userId === currentUser.uid ? 
                    `<i class="fas fa-trash delete-btn" onclick="deleteProject('${project.id}', event)"></i>` : 
                    ''}
            </div>
            <h3>${escapeHtml(project.name)}</h3>
            <p class="project-description">${escapeHtml(project.description.substring(0, 150))}${project.description.length > 150 ? '...' : ''}</p>
            <div class="project-meta">
                <span class="project-author">
                    <i class="fas fa-user"></i> ${escapeHtml(project.userName)}
                </span>
                <span>${project.createdAt ? new Date(project.createdAt.toDate()).toLocaleDateString() : 'Just now'}</span>
            </div>
            <div class="project-tags">
                ${project.tags ? project.tags.map(tag => `<span class="tag">${tag}</span>`).join('') : ''}
            </div>
            <div class="project-stats">
                <span><i class="fas fa-arrow-up"></i> ${project.upvotes || 0}</span>
                <span><i class="fas fa-arrow-down"></i> ${project.downvotes || 0}</span>
                <span><i class="fas fa-comment"></i> ${project.comments || 0}</span>
            </div>
        </div>
    `).join('');
}

// Search and filters
function initializeSearchAndFilters() {
    const searchInput = document.getElementById('searchInput');
    const sortSelect = document.getElementById('sortSelect');
    const categoryFilter = document.getElementById('categoryFilter');
    
    [searchInput, sortSelect, categoryFilter].forEach(element => {
        if (element) {
            element.addEventListener('input', loadProjects);
            element.addEventListener('change', loadProjects);
        }
    });
}

// Project modal
async function openProjectModal(projectId) {
    currentProjectId = projectId;
    const modal = document.getElementById('projectModal');
    const content = document.getElementById('modalProjectContent');
    
    content.innerHTML = '<div class="loading"><i class="fas fa-spinner"></i> Loading project...</div>';
    modal.style.display = 'block';
    
    try {
        const projectDoc = await db.collection('projects').doc(projectId).get();
        if (!projectDoc.exists) return;
        
        const project = { id: projectDoc.id, ...projectDoc.data() };
        
        // Load comments
        const commentsSnapshot = await db.collection('comments')
            .where('projectId', '==', projectId)
            .orderBy('createdAt', 'desc')
            .get();
        
        const comments = [];
        commentsSnapshot.forEach(doc => {
            comments.push({ id: doc.id, ...doc.data() });
        });
        
        displayProjectModal(project, comments);
    } catch (error) {
        showNotification(error.message, 'error');
    }
}

function displayProjectModal(project, comments) {
    const content = document.getElementById('modalProjectContent');
    
    content.innerHTML = `
        <h2>${escapeHtml(project.name)}</h2>
        <div class="project-meta">
            <span><i class="fas fa-user"></i> ${escapeHtml(project.userName)}</span>
            <span><i class="fas fa-calendar"></i> ${project.createdAt ? new Date(project.createdAt.toDate()).toLocaleDateString() : 'Just now'}</span>
        </div>
        
        <p class="project-full-description">${escapeHtml(project.description)}</p>
        
        <div class="project-link">
            <a href="${escapeHtml(project.link)}" target="_blank" rel="noopener noreferrer">
                <i class="fas fa-external-link-alt"></i> View Project
            </a>
        </div>
        
        <div class="project-tags">
            ${project.tags ? project.tags.map(tag => `<span class="tag">${tag}</span>`).join('') : ''}
        </div>
        
        <div class="project-voting">
            <button class="vote-btn" onclick="vote('${project.id}', 'up')">
                <i class="fas fa-arrow-up"></i> ${project.upvotes || 0}
            </button>
            <button class="vote-btn" onclick="vote('${project.id}', 'down')">
                <i class="fas fa-arrow-down"></i> ${project.downvotes || 0}
            </button>
        </div>
        
        <div class="comments-section">
            <h3>Comments (${comments.length})</h3>
            
            ${currentUser ? `
                <div class="add-comment">
                    <textarea id="newComment" placeholder="Share your thoughts..." rows="3"></textarea>
                    <button onclick="addComment('${project.id}')" class="submit-btn">Post Comment</button>
                </div>
            ` : `
                <p><a href="#" onclick="showAuthModal(); return false;">Login</a> to comment</p>
            `}
            
            <div class="comments-list">
                ${renderComments(comments)}
            </div>
        </div>
    `;
}

function renderComments(comments, parentId = null) {
    const filteredComments = comments.filter(c => c.parentId === parentId);
    
    if (filteredComments.length === 0) return '';
    
    return filteredComments.map(comment => `
        <div class="comment" id="comment-${comment.id}">
            <div class="comment-header">
                <span class="comment-author">${escapeHtml(comment.userName)}</span>
                <span class="comment-date">${comment.createdAt ? new Date(comment.createdAt.toDate()).toLocaleDateString() : 'Just now'}</span>
            </div>
            <div class="comment-content">${escapeHtml(comment.content)}</div>
            <div class="comment-actions">
                <div class="comment-votes">
                    <button class="vote-btn" onclick="voteComment('${comment.id}', 'up')">
                        <i class="fas fa-arrow-up"></i> ${comment.upvotes || 0}
                    </button>
                    <button class="vote-btn" onclick="voteComment('${comment.id}', 'down')">
                        <i class="fas fa-arrow-down"></i> ${comment.downvotes || 0}
                    </button>
                </div>
                ${currentUser ? `
                    <span class="reply-btn" onclick="showReplyForm('${comment.id}')">
                        <i class="fas fa-reply"></i> Reply
                    </span>
                ` : ''}
                ${currentUser && comment.userId === currentUser.uid ? `
                    <span class="delete-btn" onclick="deleteComment('${comment.id}')">
                        <i class="fas fa-trash"></i>
                    </span>
                ` : ''}
            </div>
            <div class="replies" id="replies-${comment.id}">
                ${renderComments(comments, comment.id)}
            </div>
            <div class="reply-form" id="reply-form-${comment.id}" style="display: none;">
                <textarea id="reply-content-${comment.id}" placeholder="Write your reply..." rows="2"></textarea>
                <button onclick="addReply('${comment.id}')" class="reply-submit">Post Reply</button>
            </div>
        </div>
    `).join('');
}

// Voting functions
async function vote(projectId, type) {
    if (!currentUser) {
        showNotification('Please login to vote', 'warning');
        showAuthModal();
        return;
    }
    
    try {
        const projectRef = db.collection('projects').doc(projectId);
        const voteRef = db.collection('votes').doc(`${projectId}_${currentUser.uid}`);
        
        const voteDoc = await voteRef.get();
        
        await db.runTransaction(async (transaction) => {
            const projectDoc = await transaction.get(projectRef);
            if (!projectDoc.exists) throw new Error('Project not found');
            
            let newUpvotes = projectDoc.data().upvotes || 0;
            let newDownvotes = projectDoc.data().downvotes || 0;
            
            if (voteDoc.exists) {
                const currentVote = voteDoc.data().type;
                if (currentVote === type) {
                    // Remove vote
                    if (type === 'up') newUpvotes--;
                    else newDownvotes--;
                    transaction.delete(voteRef);
                } else {
                    // Change vote
                    if (type === 'up') {
                        newUpvotes++;
                        newDownvotes--;
                    } else {
                        newDownvotes++;
                        newUpvotes--;
                    }
                    transaction.update(voteRef, { type });
                }
            } else {
                // New vote
                if (type === 'up') newUpvotes++;
                else newDownvotes++;
                transaction.set(voteRef, {
                    userId: currentUser.uid,
                    projectId,
                    type,
                    createdAt: firebase.firestore.FieldValue.serverTimestamp()
                });
            }
            
            transaction.update(projectRef, {
                upvotes: newUpvotes,
                downvotes: newDownvotes
            });
        });
        
        showNotification(`Project ${type}voted!`, 'success');
    } catch (error) {
        showNotification(error.message, 'error');
    }
}

// Comment functions
async function addComment(projectId) {
    const content = document.getElementById('newComment').value.trim();
    if (!content) {
        showNotification('Please enter a comment', 'warning');
        return;
    }
    
    try {
        const commentData = {
            projectId,
            content,
            userId: currentUser.uid,
            userName: currentUser.displayName || currentUser.email.split('@')[0],
            parentId: null,
            upvotes: 0,
            downvotes: 0,
            createdAt: firebase.firestore.FieldValue.serverTimestamp()
        };
        
        await db.collection('comments').add(commentData);
        
        // Update comment count on project
        const projectRef = db.collection('projects').doc(projectId);
        await projectRef.update({
            comments: firebase.firestore.FieldValue.increment(1)
        });
        
        document.getElementById('newComment').value = '';
        showNotification('Comment added!', 'success');
        
        // Refresh modal
        openProjectModal(projectId);
    } catch (error) {
        showNotification(error.message, 'error');
    }
}

function showReplyForm(commentId) {
    document.getElementById(`reply-form-${commentId}`).style.display = 'block';
}

async function addReply(parentId) {
    const content = document.getElementById(`reply-content-${parentId}`).value.trim();
    if (!content) {
        showNotification('Please enter a reply', 'warning');
        return;
    }
    
    try {
        const replyData = {
            projectId: currentProjectId,
            content,
            userId: currentUser.uid,
            userName: currentUser.displayName || currentUser.email.split('@')[0],
            parentId,
            upvotes: 0,
            downvotes: 0,
            createdAt: firebase.firestore.FieldValue.serverTimestamp()
        };
        
        await db.collection('comments').add(replyData);
        
        document.getElementById(`reply-content-${parentId}`).value = '';
        document.getElementById(`reply-form-${parentId}`).style.display = 'none';
        showNotification('Reply added!', 'success');
        
        // Refresh modal
        openProjectModal(currentProjectId);
    } catch (error) {
        showNotification(error.message, 'error');
    }
}

async function voteComment(commentId, type) {
    if (!currentUser) {
        showNotification('Please login to vote', 'warning');
        showAuthModal();
        return;
    }
    
    try {
        const commentRef = db.collection('comments').doc(commentId);
        const voteRef = db.collection('votes').doc(`comment_${commentId}_${currentUser.uid}`);
        
        const voteDoc = await voteRef.get();
        
        await db.runTransaction(async (transaction) => {
            const commentDoc = await transaction.get(commentRef);
            if (!commentDoc.exists) throw new Error('Comment not found');
            
            let newUpvotes = commentDoc.data().upvotes || 0;
            let newDownvotes = commentDoc.data().downvotes || 0;
            
            if (voteDoc.exists) {
                const currentVote = voteDoc.data().type;
                if (currentVote === type) {
                    if (type === 'up') newUpvotes--;
                    else newDownvotes--;
                    transaction.delete(voteRef);
                } else {
                    if (type === 'up') {
                        newUpvotes++;
                        newDownvotes--;
                    } else {
                        newDownvotes++;
                        newUpvotes--;
                    }
                    transaction.update(voteRef, { type });
                }
            } else {
                if (type === 'up') newUpvotes++;
                else newDownvotes++;
                transaction.set(voteRef, {
                    userId: currentUser.uid,
                    commentId,
                    type,
                    createdAt: firebase.firestore.FieldValue.serverTimestamp()
                });
            }
            
            transaction.update(commentRef, {
                upvotes: newUpvotes,
                downvotes: newDownvotes
            });
        });
        
        showNotification(`Comment ${type}voted!`, 'success');
    } catch (error) {
        showNotification(error.message, 'error');
    }
}

async function deleteComment(commentId) {
    if (!confirm('Are you sure you want to delete this comment?')) return;
    
    try {
        const commentRef = db.collection('comments').doc(commentId);
        const commentDoc = await commentRef.get();
        
        if (!commentDoc.exists) return;
        
        // Delete all replies recursively
        const replies = await db.collection('comments')
            .where('parentId', '==', commentId)
            .get();
        
        const batch = db.batch();
        replies.forEach(doc => batch.delete(doc.ref));
        batch.delete(commentRef);
        
        await batch.commit();
        
        // Update comment count
        if (currentProjectId) {
            const projectRef = db.collection('projects').doc(currentProjectId);
            await projectRef.update({
                comments: firebase.firestore.FieldValue.increment(-1 - replies.size)
            });
        }
        
        showNotification('Comment deleted', 'success');
        
        // Refresh modal
        if (currentProjectId) {
            openProjectModal(currentProjectId);
        }
    } catch (error) {
        showNotification(error.message, 'error');
    }
}

// Delete project
async function deleteProject(projectId, event) {
    event.stopPropagation();
    
    if (!currentUser) {
        showNotification('Please login to delete', 'warning');
        return;
    }
    
    if (!confirm('Are you sure you want to delete this project?')) return;
    
    try {
        // Delete all comments for this project
        const comments = await db.collection('comments')
            .where('projectId', '==', projectId)
            .get();
        
        const batch = db.batch();
        comments.forEach(doc => batch.delete(doc.ref));
        batch.delete(db.collection('projects').doc(projectId));
        
        await batch.commit();
        
        showNotification('Project deleted successfully', 'success');
    } catch (error) {
        showNotification(error.message, 'error');
    }
}

// Modal functions
function initializeModals() {
    // Project modal close
    document.querySelector('.close').addEventListener('click', () => {
        document.getElementById('projectModal').style.display = 'none';
    });
    
    window.addEventListener('click', (e) => {
        if (e.target === document.getElementById('projectModal')) {
            document.getElementById('projectModal').style.display = 'none';
        }
    });
}

// Utility functions
function escapeHtml(unsafe) {
    if (!unsafe) return '';
    return unsafe
        .replace(/&/g, "&amp;")
        .replace(/</g, "&lt;")
        .replace(/>/g, "&gt;")
        .replace(/"/g, "&quot;")
        .replace(/'/g, "&#039;");
}

function showNotification(message, type) {
    // Create notification element
    const notification = document.createElement('div');
    notification.className = `notification ${type}`;
    notification.innerHTML = `
        <i class="fas ${type === 'success' ? 'fa-check-circle' : type === 'error' ? 'fa-exclamation-circle' : 'fa-info-circle'}"></i>
        ${message}
    `;
    
    // Add styles dynamically
    const style = document.createElement('style');
    style.textContent = `
        .notification {
            position: fixed;
            bottom: 20px;
            right: 20px;
            padding: 1rem 2rem;
            background: var(--bg-secondary);
            color: var(--text-primary);
            border-radius: 8px;
            box-shadow: 0 2px 10px var(--shadow);
            border-left: 4px solid;
            z-index: 2000;
            animation: slideIn 0.3s ease-out;
            display: flex;
            align-items: center;
            gap: 0.5rem;
        }
        .notification.success { border-color: var(--success); }
        .notification.error { border-color: var(--danger); }
        .notification.warning { border-color: var(--accent); }
        @keyframes slideIn {
            from { transform: translateX(100%); opacity: 0; }
            to { transform: translateX(0); opacity: 1; }
        }
    `;
    document.head.appendChild(style);
    
    document.body.appendChild(notification);
    
    setTimeout(() => {
        notification.remove();
    }, 3000);
}
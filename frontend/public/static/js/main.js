document.addEventListener('DOMContentLoaded', function() {
    // Modal elements
    const loginModal = document.getElementById('loginModal');
    const registerModal = document.getElementById('registerModal');
    const loginBtn = document.getElementById('loginBtn');
    const signupBtn = document.getElementById('signupBtn');
    const showRegister = document.getElementById('showRegister');
    const closeBtns = document.querySelectorAll('.close');
    const notification = document.getElementById('notification');

    // Forms
    const loginForm = document.getElementById('loginForm');
    const registerForm = document.getElementById('registerForm');

    // Open login modal
    loginBtn.addEventListener('click', function() {
        loginModal.style.display = 'block';
    });

    // Open register modal
    signupBtn.addEventListener('click', function() {
        registerModal.style.display = 'block';
    });

    // Switch to register modal from login
    showRegister.addEventListener('click', function(e) {
        e.preventDefault();
        loginModal.style.display = 'none';
        registerModal.style.display = 'block';
    });

    // Close modals
    closeBtns.forEach(btn => {
        btn.addEventListener('click', function() {
            loginModal.style.display = 'none';
            registerModal.style.display = 'none';
        });
    });

    // Close modal when clicking outside
    window.addEventListener('click', function(event) {
        if (event.target === loginModal) {
            loginModal.style.display = 'none';
        }
        if (event.target === registerModal) {
            registerModal.style.display = 'none';
        }
    });

    // Show notification
    function showNotification(message, type = 'error') {
        notification.textContent = message;
        notification.className = `notification ${type} show`;
        
        setTimeout(() => {
            notification.classList.remove('show');
        }, 5000);
    }

    // Get CSRF token
    function getCookie(name) {
        let cookieValue = null;
        if (document.cookie && document.cookie !== '') {
            const cookies = document.cookie.split(';');
            for (let i = 0; i < cookies.length; i++) {
                const cookie = cookies[i].trim();
                if (cookie.substring(0, name.length + 1) === (name + '=')) {
                    cookieValue = decodeURIComponent(cookie.substring(name.length + 1));
                    break;
                }
            }
        }
        return cookieValue;
    }

    // Login form submission
    loginForm.addEventListener('submit', function(e) {
        e.preventDefault();
        
        const email = document.getElementById('loginEmail').value;
        const password = document.getElementById('loginPassword').value;
        
        if (!email || !password) {
            showNotification('Пожалуйста, заполните все поля');
            return;
        }

        fetch('/login/', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'X-CSRFToken': getCookie('csrftoken')
            },
            body: JSON.stringify({
                email: email,
                password: password
            })
        })
        .then(response => response.json())
        .then(data => {
            if (data.success) {
                showNotification('Успешный вход!', 'success');
                setTimeout(() => {
                    window.location.href = data.redirect;
                }, 1000);
            } else {
                showNotification(data.error);
            }
        })
        .catch(error => {
            showNotification('Произошла ошибка при входе');
            console.error('Error:', error);
        });
    });

    // Register form submission
    registerForm.addEventListener('submit', function(e) {
        e.preventDefault();
        
        const email = document.getElementById('registerEmail').value;
        const password = document.getElementById('registerPassword').value;
        const repeatPassword = document.getElementById('registerRepeatPassword').value;
        
        if (!email || !password || !repeatPassword) {
            showNotification('Пожалуйста, заполните все поля');
            return;
        }

        if (password !== repeatPassword) {
            showNotification('Пароли не совпадают');
            return;
        }

        fetch('/register/', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'X-CSRFToken': getCookie('csrftoken')
            },
            body: JSON.stringify({
                email: email,
                password: password,
                repeat_password: repeatPassword
            })
        })
        .then(response => response.json())
        .then(data => {
            if (data.success) {
                showNotification('Регистрация успешна!', 'success');
                setTimeout(() => {
                    window.location.href = data.redirect;
                }, 1000);
            } else {
                showNotification(data.error);
            }
        })
        .catch(error => {
            showNotification('Произошла ошибка при регистрации');
            console.error('Error:', error);
        });
    });

    // Disable non-functional buttons
    const forgotLinks = document.querySelectorAll('.forgot-link');
    const googleBtns = document.querySelectorAll('.btn-google');
    const returnLinks = document.querySelectorAll('.return-link');

    forgotLinks.forEach(link => {
        link.addEventListener('click', function(e) {
            e.preventDefault();
            showNotification('Функция восстановления пароля пока недоступна');
        });
    });

    googleBtns.forEach(btn => {
        btn.addEventListener('click', function(e) {
            e.preventDefault();
            showNotification('Вход через Google пока недоступен');
        });
    });

    returnLinks.forEach(link => {
        link.addEventListener('click', function(e) {
            e.preventDefault();
            loginModal.style.display = 'none';
            registerModal.style.display = 'none';
        });
    });
});
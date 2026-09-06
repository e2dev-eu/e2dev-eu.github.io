document.addEventListener('DOMContentLoaded', () => {

    // Smooth Scrolling for Navigation Links
    document.querySelectorAll('#main-nav a[href^="#"]').forEach(anchor => {
        anchor.addEventListener('click', function (e) {
            e.preventDefault(); // Prevent default anchor jump

            const targetId = this.getAttribute('href');
            const targetElement = document.querySelector(targetId);

            if (targetElement) {
                // Scroll to the target element smoothly
                targetElement.scrollIntoView({
                    behavior: 'smooth',
                    block: 'start' // Scroll to the top of the element
                });

                // Close the mobile menu after clicking a link (if open)
                const navUl = document.querySelector('#main-nav .nav-links');
                const menuToggle = document.querySelector('.menu-toggle');
                if (navUl.classList.contains('show')) {
                    navUl.classList.remove('show');
                    menuToggle.classList.remove('active');
                }
            }
        });
    });

    // Mobile Menu Toggle Functionality
    const menuToggle = document.querySelector('.menu-toggle');
    const navUl = document.querySelector('#main-nav .nav-links');

    menuToggle.addEventListener('click', () => {
        navUl.classList.toggle('show'); // Toggle the 'show' class on the nav links
        menuToggle.classList.toggle('active'); // Toggle the 'active' class on the toggle button for animation
    });

    // Close mobile menu when clicking outside (optional)
    document.addEventListener('click', (e) => {
        // Check if the click is outside the nav and the toggle button
        if (!navUl.contains(e.target) && !menuToggle.contains(e.target) && navUl.classList.contains('show')) {
            navUl.classList.remove('show');
            menuToggle.classList.remove('active');
        }
    });


    // Scroll-Triggered Fade In Animation
    const fadeInElements = document.querySelectorAll('.fade-in');

    // Options for the Intersection Observer
    const observerOptions = {
        threshold: 0.1 // Trigger when 10% of the element is visible
    };

    // Create a new Intersection Observer
    const observer = new IntersectionObserver((entries, observer) => {
        entries.forEach(entry => {
            if (entry.isIntersecting) {
                // If the element is in the viewport, add the 'visible' class
                entry.target.classList.add('visible');
                // Stop observing the element after it becomes visible
                observer.unobserve(entry.target);
            }
        });
    }, observerOptions);

    // Observe each element with the 'fade-in' class
    fadeInElements.forEach(element => {
        observer.observe(element);
    });


    // Project Modal - click a project card (or one image in a
    // multi-image card) to see it bigger with the description below
    const projectModal = document.getElementById('project-modal');
    if (projectModal) {
        const modalImg = projectModal.querySelector('.project-modal-img');
        const modalTitle = projectModal.querySelector('.project-modal-title');
        const modalDesc = projectModal.querySelector('.project-modal-desc');

        const openProjectModal = (imgEl, infoEl) => {
            modalImg.src = imgEl.src;
            modalImg.alt = imgEl.alt;
            modalTitle.textContent = infoEl.querySelector('h3').textContent;
            modalDesc.textContent = infoEl.querySelector('p').textContent;
            projectModal.classList.add('open');
            projectModal.setAttribute('aria-hidden', 'false');
            document.body.classList.add('modal-open');
        };

        const closeProjectModal = () => {
            projectModal.classList.remove('open');
            projectModal.setAttribute('aria-hidden', 'true');
            document.body.classList.remove('modal-open');
        };

        document.querySelectorAll('#projects .project-item').forEach(item => {
            item.addEventListener('click', (e) => {
                const infoEl = item.querySelector('.project-info');
                const clickedImg = e.target.closest('img');
                // A gallery card has several images - open the one that was
                // actually clicked; otherwise fall back to the card's only image.
                const imgEl = (clickedImg && item.contains(clickedImg)) ? clickedImg : item.querySelector('img');
                if (imgEl && infoEl) {
                    openProjectModal(imgEl, infoEl);
                }
            });
        });

        projectModal.querySelectorAll('[data-close]').forEach(el => {
            el.addEventListener('click', closeProjectModal);
        });

        document.addEventListener('keydown', (e) => {
            if (e.key === 'Escape' && projectModal.classList.contains('open')) {
                closeProjectModal();
            }
        });
    }
});

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
});

document.addEventListener('DOMContentLoaded', () => {
    const backToPlannerBtn = document.getElementById('backToPlannerBtn');
    const gypsumFramingCalendarContainer = document.querySelector('#gypsumFramingCalendar .calendar-display');
    const gypsumBoardInstallationCalendarContainer = document.querySelector('#gypsumBoardInstallationCalendar .calendar-display');
    const paintTeamCalendarContainer = document.querySelector('#paintTeamCalendar .calendar-display');

    const dashboardTaskPopup = document.getElementById('dashboardTaskPopup');
    const dashboardPopupDate = document.getElementById('dashboardPopupDate');
    const dashboardPopupTaskList = document.getElementById('dashboardPopupTaskList');
    const closeDashboardPopupBtn = dashboardTaskPopup.querySelector('.close-popup');

    const targetTeams = [
        "Gypsum - Framing",
        "Gypsum - Board Installation",
        "Paint Team"
    ];

    // This mapping must align with the CSS classes for colors (from style.css)
    const teamClassMap = {
        "Gypsum - Framing": "Gypsum",
        "Gypsum - Board Installation": "Gypsum",
        "Wiring Team": "Wiring",
        "AC Team": "AC",
        "Lighting Team": "Lighting",
        "Paint Team": "Paint",
    };

    const getTeamClass = (teamName) => {
        return teamClassMap[teamName] || 'Other'; 
    };

    // Helper for date formatting (dd/mm/yyyy)
    const formatDateForDisplay = (dateString) => {
        if (!dateString) return '';
        const date = new Date(dateString);
        const day = String(date.getDate()).padStart(2, '0');
        const month = String(date.getMonth() + 1).padStart(2, '0'); 
        const year = date.getFullYear();
        return `${day}/${month}/${year}`;
    };

    // Function to load all project data from local storage
    const loadAllProjectTasks = () => {
        let allTasks = [];
        try {
            const storedProjects = localStorage.getItem('allProjects');
            if (storedProjects) {
                const projects = JSON.parse(storedProjects);
                for (const projectId in projects) {
                    if (projects.hasOwnProperty(projectId)) {
                        const project = projects[projectId];
                        // Only add tasks from targetTeams for the dashboard
                        project.deadlines.forEach(task => {
                            if (targetTeams.includes(task.team)) {
                                allTasks.push({ 
                                    ...task, 
                                    projectName: project.name, 
                                    projectId: projectId 
                                });
                            }
                        });
                    }
                }
            }
        } catch (e) {
            console.error("Failed to load all projects from local storage:", e);
        }
        return allTasks;
    };

    // Function to generate calendar HTML for a specific team
    function generateTeamCalendar(teamName, tasksForTeam, targetCalendarElement) {
        // Get the start of the current month
        const now = new Date();
        const currentYear = now.getFullYear();
        const currentMonth = now.getMonth(); 

        const monthNames = ["January", "February", "March", "April", "May", "June", "July", "August", "September", "October", "November", "December"];
        
        const firstDayOfMonth = new Date(currentYear, currentMonth, 1);
        const startingDayOfWeek = firstDayOfMonth.getDay(); 

        const displayStartDate = new Date(firstDayOfMonth);
        displayStartDate.setDate(firstDayOfMonth.getDate() - startingDayOfWeek);

        let calendarGridHtml = `
            <div class="calendar-header-month">${monthNames[currentMonth]} ${currentYear}</div>
            <div class="calendar-grid">
                <div class="day-of-week">Sun</div>
                <div class="day-of-week">Mon</div>
                <div class="day-of-week">Tue</div>
                <div class="day-of-week">Wed</div>
                <div class="day-of-week">Thu</div>
                <div class="day-of-week">Fri</div>
                <div class="day-of-week">Sat</div>
        `;
        
        let currentDate = new Date(displayStartDate);
        const calendarTasksData = {}; 

        for (let i = 0; i < 42; i++) {
            const dateStr = currentDate.toISOString().slice(0, 10);
            const isCurrentMonth = currentDate.getMonth() === currentMonth && currentDate.getFullYear() === currentYear;

            const tasksOnDay = tasksForTeam.filter(task => {
                const start = new Date(task.startDate);
                const end = new Date(task.endDate);
                start.setHours(0,0,0,0);
                end.setHours(0,0,0,0);
                currentDate.setHours(0,0,0,0); 
                return currentDate >= start && currentDate <= end;
            });
            
            calendarTasksData[dateStr] = tasksOnDay; 

            let projectSwatchesHtml = '';
            const projectsWithTasksOnDay = new Set();
            tasksOnDay.forEach(task => projectsWithTasksOnDay.add(task.projectId)); 

            Array.from(projectsWithTasksOnDay).forEach(projectId => {
                const taskExample = tasksOnDay.find(t => t.projectId === projectId); 
                const teamClass = getTeamClass(taskExample.team); 
                projectSwatchesHtml += `<div class="task-swatch ${teamClass}" title="Project: ${taskExample.projectName}"></div>`;
            });

            calendarGridHtml += `
                <div class="date-cell" data-date="${dateStr}" data-team="${teamName}" style="opacity: ${isCurrentMonth ? 1 : 0.4};">
                    <span class="date-number">${currentDate.getDate()}</span>
                    <div class="task-swatches-container">
                        ${projectSwatchesHtml}
                    </div>
                </div>
            `;
            currentDate.setDate(currentDate.getDate() + 1); 
        }

        calendarGridHtml += '</div>';
        targetCalendarElement.innerHTML = calendarGridHtml;

        targetCalendarElement.querySelectorAll('.date-cell').forEach(cell => {
            cell.addEventListener('click', (e) => {
                const dateClicked = e.currentTarget.dataset.date;
                const teamClicked = e.currentTarget.dataset.team;
                showDashboardTaskPopup(dateClicked, teamClicked, calendarTasksData[dateClicked]);
            });
        });
    }

    const showDashboardTaskPopup = (dateStr, teamName, tasks) => {
        dashboardPopupDate.textContent = `${formatDateForDisplay(dateStr)} - ${teamName}`;
        dashboardPopupTaskList.innerHTML = '';

        if (tasks && tasks.length > 0) {
            tasks.sort((a, b) => a.projectName.localeCompare(b.projectName));

            tasks.forEach(task => {
                const listItem = document.createElement('li');
                const teamClass = getTeamClass(task.team); 
                listItem.className = `task-item ${teamClass}`;
                listItem.innerHTML = `
                    <div class="task-details">
                        <strong>Project: ${task.projectName}</strong><br>
                        Area: ${task.area}<br>
                        Task: ${task.team}<br>
                        <span>Start: ${formatDateForDisplay(task.startDate)} - End: ${formatDateForDisplay(task.endDate)}</span>
                    </div>
                `;
                dashboardPopupTaskList.appendChild(listItem);
            });
        } else {
            const listItem = document.createElement('li');
            listItem.textContent = "No tasks for this team on this date.";
            dashboardPopupTaskList.appendChild(listItem);
        }
        dashboardTaskPopup.style.display = 'block';
    };

    const initDashboard = () => {
        const allTasksAcrossProjects = loadAllProjectTasks();

        const gypsumFramingTasks = allTasksAcrossProjects.filter(task => task.team === "Gypsum - Framing");
        const gypsumBoardInstallationTasks = allTasksAcrossProjects.filter(task => task.team === "Gypsum - Board Installation");
        const paintTeamTasks = allTasksAcrossProjects.filter(task => task.team === "Paint Team");

        generateTeamCalendar("Gypsum - Framing", gypsumFramingTasks, gypsumFramingCalendarContainer);
        generateTeamCalendar("Gypsum - Board Installation", gypsumBoardInstallationTasks, gypsumBoardInstallationCalendarContainer);
        generateTeamCalendar("Paint Team", paintTeamTasks, paintTeamCalendarContainer);
    };

    backToPlannerBtn.addEventListener('click', () => {
        window.location.href = 'index.html'; 
    });

    closeDashboardPopupBtn.addEventListener('click', () => {
        dashboardTaskPopup.style.display = 'none';
    });

    window.addEventListener('click', (e) => {
        if (e.target === dashboardTaskPopup) {
            dashboardTaskPopup.style.display = 'none';
        }
    });

    initDashboard();
});
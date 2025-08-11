document.addEventListener('DOMContentLoaded', () => {
    const backToPlannerBtn = document.getElementById('backToPlannerBtn');
    const downloadDashboardBtn = document.getElementById('downloadDashboardBtn'); 

    const dynamicTeamCalendarsContainer = document.getElementById('dynamicTeamCalendarsContainer');
    const noTeamsMessage = document.getElementById('noTeamsMessage');

    const dashboardTaskPopup = document.getElementById('dashboardTaskPopup');
    const dashboardPopupDate = document.getElementById('dashboardPopupDate');
    const dashboardPopupTaskList = document.getElementById('dashboardPopupTaskList');
    const closeDashboardPopupBtn = dashboardTaskPopup.querySelector('.close-popup');

    // These are the *types* of teams we want to display on the dashboard
    // Any team starting with "Gypsum " will be grouped as "Gypsum" for coloring
    // and then displayed with its full unique name.
    const relevantTeamPrefixes = ["Gypsum ", "Paint Team"];

    // This mapping defines which CSS class to use for coloring a specific team type
    const teamClassMap = {
        "Gypsum": "Gypsum", // All custom Gypsum teams will use the .Gypsum class
        "Wiring Team": "Wiring",
        "AC Team": "AC",
        "Lighting Team": "Lighting",
        "Paint Team": "Paint",
        "Other": "Other" // Fallback for any other custom team
    };

    const getTeamClass = (teamName) => {
        if (teamName.startsWith("Gypsum ")) {
            return teamClassMap["Gypsum"]; // All Gypsum teams use the "Gypsum" class for color
        }
        // For other predefined teams, use their direct map
        const mappedClass = teamClassMap[teamName];
        if (mappedClass) return mappedClass;
        
        // Fallback for any other team not explicitly mapped
        return teamClassMap["Other"]; 
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

    // Helper to download the current page as an image
    const downloadPageAsImage = async () => {
        try {
            // Temporarily hide elements that shouldn't be in the screenshot
            downloadDashboardBtn.style.display = 'none';
            const allPopups = document.querySelectorAll('.task-popup');
            allPopups.forEach(popup => {
                if (popup.style.display === 'block') {
                    popup.dataset.wasVisible = 'true';
                    popup.style.display = 'none';
                }
            });


            const canvas = await html2canvas(document.body, {
                scale: 2, 
                useCORS: true, 
                windowWidth: document.documentElement.offsetWidth,
                windowHeight: document.documentElement.offsetHeight,
                scrollX: 0, 
                scrollY: 0,
                height: document.body.scrollHeight,
                width: document.body.scrollWidth,
            });

            // Restore hidden elements
            downloadDashboardBtn.style.display = '';
            allPopups.forEach(popup => {
                if (popup.dataset.wasVisible === 'true') {
                    popup.style.display = 'block';
                    delete popup.dataset.wasVisible;
                }
            });

            const link = document.createElement('a');
            link.href = canvas.toDataURL('image/png');
            link.download = `team_dashboard_${new Date().toISOString().slice(0, 10)}.png`;
            document.body.appendChild(link);
            link.click();
            document.body.removeChild(link);
        } catch (error) {
            console.error('Error generating image:', error);
            alert('Failed to download image. Please try again or check console for errors.');
        }
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
                        // Only add tasks from relevant teams for dashboard display
                        project.deadlines.forEach(task => {
                            const isRelevantGypsum = task.team.startsWith("Gypsum ");
                            const isPaintTeam = task.team === "Paint Team";

                            if (isRelevantGypsum || isPaintTeam) {
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
    function generateTeamCalendar(teamDisplayName, tasksForTeam, targetContainer) {
        // Get the start of the current month (or a range relevant to tasks if desired)
        const now = new Date();
        const currentYear = now.getFullYear();
        const currentMonth = now.getMonth(); // 0-indexed

        const monthNames = ["January", "February", "March", "April", "May", "June", "July", "August", "September", "October", "November", "December"];
        
        const firstDayOfMonth = new Date(currentYear, currentMonth, 1);
        const startingDayOfWeek = firstDayOfMonth.getDay(); 

        const displayStartDate = new Date(firstDayOfMonth);
        displayStartDate.setDate(firstDayOfMonth.getDate() - startingDayOfWeek);

        const teamCalendarSection = document.createElement('div');
        teamCalendarSection.className = 'team-calendar-section';
        teamCalendarSection.innerHTML = `<h2>${teamDisplayName} Calendar</h2><div class="calendar-display"></div>`;
        const calendarDisplay = teamCalendarSection.querySelector('.calendar-display');


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

        for (let i = 0; i < 42; i++) { // Render 6 weeks (42 days) to ensure a full calendar grid for the month
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
            // Get unique project IDs for tasks on this day for the current team
            const projectsWithTasksOnDay = new Set();
            tasksOnDay.forEach(task => projectsWithTasksOnDay.add(task.projectId)); 

            Array.from(projectsWithTasksOnDay).forEach(projectId => {
                const taskExample = tasksOnDay.find(t => t.projectId === projectId); 
                const teamClass = getTeamClass(taskExample.team); 
                projectSwatchesHtml += `<div class="task-swatch ${teamClass}" title="Project: ${taskExample.projectName}"></div>`;
            });

            calendarGridHtml += `
                <div class="date-cell" data-date="${dateStr}" data-team="${teamDisplayName}" style="opacity: ${isCurrentMonth ? 1 : 0.4};">
                    <span class="date-number">${currentDate.getDate()}</span>
                    <div class="task-swatches-container">
                        ${projectSwatchesHtml}
                    </div>
                </div>
            `;
            currentDate.setDate(currentDate.getDate() + 1); 
        }

        calendarGridHtml += '</div>';
        calendarDisplay.innerHTML = calendarGridHtml;
        dynamicTeamCalendarsContainer.appendChild(teamCalendarSection); // Add the whole section to the DOM

        // Attach event listeners for popup
        calendarDisplay.querySelectorAll('.date-cell').forEach(cell => {
            cell.addEventListener('click', (e) => {
                const dateClicked = e.target.closest('.date-cell').dataset.date; // Use closest to ensure click on swatch triggers it
                const teamClicked = e.target.closest('.date-cell').dataset.team;
                showDashboardTaskPopup(dateClicked, teamClicked, calendarTasksData[dateClicked]);
            });
        });
    }

    // Function to display the dashboard popup
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
            listItem.textContent = `No tasks for ${teamName} on this date.`;
            dashboardPopupTaskList.appendChild(listItem);
        }
        dashboardTaskPopup.style.display = 'block';
    };

    // Initialize the dashboard
    const initDashboard = () => {
        const allTasksAcrossProjects = loadAllProjectTasks();
        dynamicTeamCalendarsContainer.innerHTML = ''; // Clear existing content

        if (allTasksAcrossProjects.length === 0) {
            noTeamsMessage.style.display = 'block';
            return;
        } else {
            noTeamsMessage.style.display = 'none';
        }

        const uniqueTeamsFound = new Set();
        allTasksAcrossProjects.forEach(task => {
            if (task.team.startsWith("Gypsum ") || task.team === "Paint Team") {
                uniqueTeamsFound.add(task.team);
            }
        });

        // Sort unique teams for consistent display order (alphabetical)
        const sortedUniqueTeams = Array.from(uniqueTeamsFound).sort();

        if (sortedUniqueTeams.length === 0) {
            noTeamsMessage.style.display = 'block';
            return;
        }

        sortedUniqueTeams.forEach(teamName => {
            const tasksForThisTeam = allTasksAcrossProjects.filter(task => task.team === teamName);
            generateTeamCalendar(teamName, tasksForThisTeam, dynamicTeamCalendarsContainer);
        });
    };

    // Event listeners
    backToPlannerBtn.addEventListener('click', () => {
        window.location.href = 'index.html'; 
    });

    downloadDashboardBtn.addEventListener('click', downloadPageAsImage);

    closeDashboardPopupBtn.addEventListener('click', () => {
        dashboardTaskPopup.style.display = 'none';
    });

    window.addEventListener('click', (e) => {
        if (e.target === dashboardTaskPopup) {
            dashboardTaskPopup.style.display = 'none';
        }
    });

    // Run dashboard initialization on page load
    initDashboard();
});
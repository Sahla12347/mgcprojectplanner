document.addEventListener('DOMContentLoaded', () => {
    const projectForm = document.getElementById('projectForm');
    const areasContainer = document.getElementById('areas-container');
    const addAreaBtn = document.getElementById('addAreaBtn');
    const saveAllBtn = document.getElementById('saveAllBtn');
    const reportView = document.getElementById('report-view');
    const calendarsView = document.getElementById('calendars-view');
    const legendView = document.getElementById('legend-view');
    const projectNameInput = document.getElementById('projectNameInput');
    const taskPopup = document.getElementById('taskPopup');
    const popupDate = document.getElementById('popupDate');
    const popupTaskList = document.getElementById('popupTaskList');
    const closePopupBtn = document.querySelector('.close-popup');

    // Project management elements
    const newProjectBtn = document.getElementById('newProjectBtn');
    const projectSelector = document.getElementById('projectSelector');
    const deleteProjectBtn = document.getElementById('deleteProjectBtn');
    const viewDashboardBtn = document.getElementById('viewDashboardBtn'); 

    let currentProjectId = null; 
    let allProjects = {}; 
    let projectDeadlines = []; 

    const defaultTeams = [
        "Gypsum - Framing", "Gypsum - Board Installation",
        "Wiring Team", "AC Team",
        "Lighting Team", "Paint Team" 
    ];

    const generateUUID = () => {
        return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, function(c) {
            var r = Math.random() * 16 | 0, v = c == 'x' ? r : (r & 0x3 | 0x8);
            return v.toString(16);
        });
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


    const debounce = (func, delay) => {
        let timeoutId;
        return (...args) => {
            clearTimeout(timeoutId);
            timeoutId = setTimeout(() => {
                func(...args);
            }, delay);
        };
    };

    // --- Project Data Management Functions ---

    const saveCurrentProject = () => {
        if (!currentProjectId) return; 

        const projectData = {
            name: projectNameInput.value,
            deadlines: [] 
        };

        const areaBlocks = areasContainer.querySelectorAll('.area-block');
        areaBlocks.forEach(areaBlock => {
            const areaName = areaBlock.querySelector('.area-name-input').value;
            const taskRows = areaBlock.querySelectorAll('.task-row');
            
            taskRows.forEach(row => {
                const teamElement = row.querySelector('.team-select') || row.querySelector('.team-name-input');
                const teamName = teamElement ? teamElement.value : '';
                const startDate = row.querySelector('.start-date') ? row.querySelector('.start-date').value : '';
                const endDate = row.querySelector('.end-date') ? row.querySelector('.end-date').value : '';

                if (areaName && teamName && startDate && endDate) {
                    projectData.deadlines.push({
                        area: areaName,
                        team: teamName,
                        startDate: startDate,
                        endDate: endDate
                    });
                }
            });
        });

        allProjects[currentProjectId] = projectData; 
        try {
            localStorage.setItem('allProjects', JSON.stringify(allProjects));
            localStorage.setItem('currentProjectId', currentProjectId); 
            console.log(`Project "${projectData.name}" (${currentProjectId}) autosaved.`);
        } catch (e) {
            console.error('Autosave failed:', e);
        }
    };
    
    const debouncedSave = debounce(saveCurrentProject, 1000);

    const loadProject = (projectId) => {
        if (!allProjects[projectId]) {
            console.error(`Project with ID ${projectId} not found.`);
            return;
        }

        currentProjectId = projectId;
        const project = allProjects[projectId];
        projectNameInput.value = project.name;
        projectDeadlines = project.deadlines; 

        renderProject(); 
        updateProjectSelector(); 

        localStorage.setItem('currentProjectId', currentProjectId);
    };

    const createNewProject = (defaultName = 'New Gypsum Project') => {
        const newId = generateUUID();
        allProjects[newId] = {
            name: defaultName,
            deadlines: []
        };
        loadProject(newId); 
        areasContainer.innerHTML = ''; 
        createAreaBlock(); 
        saveCurrentProject(); 
    };

    const deleteCurrentProject = () => {
        if (!currentProjectId || !allProjects[currentProjectId]) {
            alert("No project selected to delete.");
            return;
        }

        if (Object.keys(allProjects).length === 1) {
            if (!confirm("This is your last project. Deleting it will create a new blank project. Continue?")) {
                return;
            }
        } else {
            if (!confirm(`Are you sure you want to delete project "${allProjects[currentProjectId].name}"? This action cannot be undone.`)) {
                return;
            }
        }

        const deletedProjectId = currentProjectId;
        delete allProjects[deletedProjectId]; 

        try {
            localStorage.setItem('allProjects', JSON.stringify(allProjects));
            const remainingProjectIds = Object.keys(allProjects);
            if (remainingProjectIds.length > 0) {
                loadProject(remainingProjectIds[0]); 
            } else {
                createNewProject(); 
            }
        } catch (e) {
            console.error('Delete failed:', e);
        }
    };


    const initializeProjects = () => {
        try {
            const storedProjects = localStorage.getItem('allProjects');
            if (storedProjects) {
                allProjects = JSON.parse(storedProjects);
                const storedCurrentProjectId = localStorage.getItem('currentProjectId');
                if (storedCurrentProjectId && allProjects[storedCurrentProjectId]) {
                    loadProject(storedCurrentProjectId);
                } else {
                    const projectIds = Object.keys(allProjects);
                    if (projectIds.length > 0) {
                        loadProject(projectIds[0]);
                    } else {
                        createNewProject(); 
                    }
                }
            } else {
                createNewProject(); 
            }
        } catch (e) {
            console.error("Failed to load projects from local storage:", e);
            alert("Could not load your projects. Local storage may be corrupted or disabled. Starting a new project.");
            localStorage.clear(); 
            createNewProject();
        }
    };

    const updateProjectSelector = () => {
        projectSelector.innerHTML = ''; 
        const projectIds = Object.keys(allProjects);

        if (projectIds.length === 0) {
            projectSelector.disabled = true;
            deleteProjectBtn.disabled = true;
            return;
        } else {
            projectSelector.disabled = false;
            deleteProjectBtn.disabled = false;
        }

        projectIds.forEach(id => {
            const option = document.createElement('option');
            option.value = id;
            option.textContent = allProjects[id].name;
            if (id === currentProjectId) {
                option.selected = true;
            }
            projectSelector.appendChild(option);
        });
    };


    // --- UI Rendering Functions ---

    function createTeamSelect(selectedValue = '') {
        const isCustomTeam = selectedValue && !defaultTeams.includes(selectedValue);
        if (isCustomTeam) {
            return `<input type="text" class="team-name-input" value="${selectedValue}" required>`;
        }

        let options = defaultTeams.map(team =>
            `<option value="${team}" ${team === selectedValue ? 'selected' : ''}>${team}</option>`
        ).join('');

        return `
            <select class="team-select" required>
                <option value="">Select Team</option>
                ${options}
                <option value="Other" ${selectedValue === 'Other' ? 'selected' : ''}>Other</option>
            </select>
        `;
    }

    function createAreaBlock(areaName = '', tasks = [{ team: '', startDate: '', endDate: '' }]) {
        const areaBlock = document.createElement('div');
        areaBlock.className = 'area-block';
        
        let tasksHtml = tasks.map(task => `
            <div class="task-row">
                ${createTeamSelect(task.team)}
                <input type="date" class="start-date" value="${task.startDate || ''}" required>
                <input type="date" class="end-date" value="${task.endDate || ''}" required>
                <button type="button" class="remove-task-btn"><i class="fas fa-times"></i></button>
            </div>
        `).join('');

        areaBlock.innerHTML = `
            <h3>
                <input type="text" class="area-name-input" placeholder="Area Name (e.g., Reception)" value="${areaName}" required>
                <button type="button" class="remove-area-btn"><i class="fas fa-trash-alt"></i></button>
            </h3>
            <div class="tasks-container">
                ${tasksHtml}
            </div>
            <button type="button" class="add-task-btn"><i class="fas fa-plus"></i> Add Task</button>
        `;
        areasContainer.appendChild(areaBlock);
    }

    function renderProject() {
        if (!currentProjectId || !allProjects[currentProjectId]) {
            areasContainer.innerHTML = '';
            reportView.innerHTML = '<p>No project loaded. Create a new one or select from the list.</p>';
            calendarsView.innerHTML = '';
            legendView.innerHTML = '';
            return;
        }

        const project = allProjects[currentProjectId];
        projectNameInput.value = project.name;
        projectDeadlines = project.deadlines; 

        if (projectDeadlines.length > 0) {
            const groupedTasks = projectDeadlines.reduce((acc, task) => {
                if (!acc[task.area]) {
                    acc[task.area] = [];
                }
                acc[task.area].push(task);
                return acc;
            }, {});
            areasContainer.innerHTML = '';
            for (const area in groupedTasks) {
                createAreaBlock(area, groupedTasks[area]);
            }
        } else {
            areasContainer.innerHTML = '';
            createAreaBlock(); 
        }
        renderAreaCalendars(); // Calendars now render first
        renderReport();
    }

    function renderReport() {
        if (projectDeadlines.length === 0) {
            reportView.innerHTML = '<p>No tasks have been added yet for this project. Use the form above to get started!</p>';
            return;
        }

        const datesWithTasks = {};
        const allDates = new Set();

        projectDeadlines.forEach(task => {
            const start = new Date(task.startDate);
            const end = new Date(task.endDate);
            let currentDate = new Date(start);

            while (currentDate <= end) {
                const dateStr = currentDate.toISOString().slice(0, 10);
                allDates.add(dateStr);
                if (!datesWithTasks[dateStr]) {
                    datesWithTasks[dateStr] = [];
                }
                datesWithTasks[dateStr].push(task);
                currentDate.setDate(currentDate.getDate() + 1);
            }
        });

        const sortedDates = Array.from(allDates).sort();

        let reportHtml = `
            <table>
                <thead>
                    <tr>
                        <th>Date</th>
                        <th>Scheduled Work</th>
                    </tr>
                </thead>
                <tbody>
        `;
        
        sortedDates.forEach(date => {
            const tasksForDay = datesWithTasks[date];
            
            reportHtml += `
                <tr>
                    <td>${formatDateForDisplay(date)}</td>
                    <td>
                        <div class="tasks-for-day">
            `;

            const tasksByArea = {};
            tasksForDay.forEach(task => {
                if (!tasksByArea[task.area]) {
                    tasksByArea[task.area] = [];
                }
                tasksByArea[task.area].push(task);
            });

            const sortedAreas = Object.keys(tasksByArea).sort();

            sortedAreas.forEach(areaName => {
                reportHtml += `
                    <h4>Area: ${areaName}</h4>
                    <ul>
                `;
                tasksByArea[areaName].forEach(task => {
                    const teamClass = defaultTeams.includes(task.team) ? task.team.split(' ')[0].replace(/[^a-zA-Z]/g, '') : 'Other';
                    reportHtml += `
                        <li class="task-item ${teamClass}">
                            <div class="task-details">
                                <strong>${task.team}</strong>
                                <span>Start: ${formatDateForDisplay(task.startDate)} - End: ${formatDateForDisplay(task.endDate)}</span>
                            </div>
                        </li>
                    `;
                });
                reportHtml += `
                    </ul>
                `;
            });

            reportHtml += `
                        </div>
                    </td>
                </tr>
            `;
        });

        reportHtml += `
                </tbody>
            </table>
        `;

        reportView.innerHTML = reportHtml;
    }

    function renderAreaCalendars() {
        calendarsView.innerHTML = '';
        legendView.innerHTML = '';

        if (projectDeadlines.length === 0) {
            return;
        }

        const tasksByArea = {};
        const allTeams = new Set();
        projectDeadlines.forEach(task => {
            if (!tasksByArea[task.area]) {
                acc[task.area] = [];
            }
            tasksByArea[task.area].push(task);
            allTeams.add(task.team);
        });

        renderLegend([...allTeams]);

        for (const areaName in tasksByArea) {
            const areaTasks = tasksByArea[areaName];

            const minDate = new Date(Math.min(...areaTasks.map(t => new Date(t.startDate))));
            const maxDate = new Date(Math.max(...areaTasks.map(t => new Date(t.endDate))));
            
            let currentMonth = new Date(minDate.getFullYear(), minDate.getMonth(), 1);
            const calendarContainer = document.createElement('div');
            calendarContainer.className = 'area-calendar';
            
            const areaHeader = document.createElement('h3');
            areaHeader.className = 'calendar-header';
            areaHeader.textContent = areaName;
            calendarContainer.appendChild(areaHeader);

            while (currentMonth <= maxDate) {
                const calendarHTML = generateCalendarForMonth(currentMonth.getFullYear(), currentMonth.getMonth(), areaTasks);
                const calendarContent = document.createElement('div');
                calendarContent.className = 'calendar-content';
                calendarContent.innerHTML = calendarHTML;
                calendarContainer.appendChild(calendarContent);
                
                currentMonth.setMonth(currentMonth.getMonth() + 1);
            }
            calendarsView.appendChild(calendarContainer);
        }
    }

    function renderLegend(teams) {
        let legendHtml = `
            <table class="legend-table">
                <thead>
                    <tr>
                        <th>Color</th>
                        <th>Team/Task</th>
                    </tr>
                </thead>
                <tbody>
        `;
        
        const renderedTeams = new Set();
        teams.forEach(team => {
            const teamClass = defaultTeams.includes(team) ? team.split(' ')[0].replace(/[^a-zA-Z]/g, '') : 'Other';
            if (!renderedTeams.has(teamClass) || (teamClass === 'Other' && !renderedTeams.has(team))) {
                legendHtml += `
                    <tr>
                        <td><div class="color-swatch ${teamClass}"></div></td>
                        <td>${team}</td>
                    </tr>
                `;
                renderedTeams.add(teamClass);
                if (teamClass === 'Other') renderedTeams.add(team); 
            }
        });

        legendHtml += `
                </tbody>
            </table>
        `;
        legendView.innerHTML = legendHtml;
    }

    function generateCalendarForMonth(year, month, tasks) {
        const monthNames = ["January", "February", "March", "April", "May", "June", "July", "August", "September", "October", "November", "December"];
        const firstDayOfMonth = new Date(year, month, 1);
        const startingDayOfWeek = firstDayOfMonth.getDay(); 
        const displayStartDate = new Date(firstDayOfMonth);
        displayStartDate.setDate(firstDayOfMonth.getDate() - startingDayOfWeek);

        let calendarGridHtml = `
            <div class="calendar-header-month">${monthNames[month]} ${year}</div>
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
        for (let i = 0; i < 42; i++) {
            const dateStr = currentDate.toISOString().slice(0, 10);
            const isCurrentMonth = currentDate.getMonth() === month && currentDate.getFullYear() === year;

            let tasksForDay = tasks.filter(task => {
                const start = new Date(task.startDate);
                const end = new Date(task.endDate);
                start.setHours(0,0,0,0);
                end.setHours(0,0,0,0);
                currentDate.setHours(0,0,0,0);
                return currentDate >= start && currentDate <= end;
            });
            
            let colorSwatchesHtml = '';
            tasksForDay.forEach(task => {
                const teamClass = defaultTeams.includes(task.team) ? task.team.split(' ')[0].replace(/[^a-zA-Z]/g, '') : 'Other';
                colorSwatchesHtml += `<div class="task-swatch ${teamClass}"></div>`;
            });

            calendarGridHtml += `
                <div class="date-cell" data-date="${dateStr}" style="opacity: ${isCurrentMonth ? 1 : 0.4};">
                    <span class="date-number">${currentDate.getDate()}</span>
                    <div class="task-swatches-container">
                        ${colorSwatchesHtml}
                    </div>
                </div>
            `;
            currentDate.setDate(currentDate.getDate() + 1); 
        }

        calendarGridHtml += '</div>';
        return calendarGridHtml;
    }

    // --- Event Listeners ---

    initializeProjects();

    newProjectBtn.addEventListener('click', () => createNewProject());
    deleteProjectBtn.addEventListener('click', deleteCurrentProject);

    viewDashboardBtn.addEventListener('click', () => {
        window.location.href = 'dashboard.html'; 
    });

    projectSelector.addEventListener('change', (e) => {
        loadProject(e.target.value);
    });

    projectNameInput.addEventListener('input', debouncedSave);
    projectForm.addEventListener('input', debouncedSave);
    projectForm.addEventListener('change', debouncedSave); 

    addAreaBtn.addEventListener('click', () => {
        createAreaBlock();
        debouncedSave(); 
    });

    projectForm.addEventListener('click', (e) => {
        if (e.target.closest('.add-task-btn')) {
            e.preventDefault();
            const tasksContainer = e.target.closest('.area-block').querySelector('.tasks-container');
            tasksContainer.insertAdjacentHTML('beforeend', `
                <div class="task-row">
                    ${createTeamSelect()}
                    <input type="date" class="start-date" required>
                    <input type="date" class="end-date" required>
                    <button type="button" class="remove-task-btn"><i class="fas fa-times"></i></button>
                </div>
            `);
            debouncedSave();
        }

        if (e.target.closest('.remove-task-btn')) {
            e.preventDefault();
            const taskContainer = e.target.closest('.tasks-container');
            if (taskContainer.querySelectorAll('.task-row').length > 1) {
                e.target.closest('.task-row').remove();
                debouncedSave();
            } else {
                alert("Each area must have at least one task.");
            }
        }

        if (e.target.closest('.remove-area-btn')) {
            e.preventDefault();
            if (areasContainer.querySelectorAll('.area-block').length > 1) {
                e.target.closest('.area-block').remove();
                debouncedSave();
            } else {
                alert("You must have at least one area.");
            }
        }
    });

    projectForm.addEventListener('change', (e) => {
        if (e.target.classList.contains('team-select') && e.target.value === 'Other') {
            const selectElement = e.target;
            const parent = selectElement.parentElement;
            const newTeamInput = document.createElement('input');
            newTeamInput.type = 'text';
            newTeamInput.className = 'team-name-input';
            newTeamInput.value = 'Other'; 
            newTeamInput.required = true;
            parent.replaceChild(newTeamInput, selectElement);
            newTeamInput.focus();
            newTeamInput.select(); 
            debouncedSave();
        }
    });

    projectForm.addEventListener('blur', (e) => {
        if (e.target.classList.contains('team-name-input') && e.target.value === 'Other') {
            const inputElement = e.target;
            const parent = inputElement.parentElement;
            const newSelect = document.createElement('select');
            newSelect.className = 'team-select';
            newSelect.required = true;
            newSelect.innerHTML = `
                <option value="">Select Team</option>
                ${defaultTeams.map(team => `<option value="${team}">${team}</option>`).join('')}
                <option value="Other" selected>Other</option>
            `;
            parent.replaceChild(newSelect, inputElement);
            debouncedSave();
        }
    }, true); 

    saveAllBtn.addEventListener('click', (e) => {
        e.preventDefault(); 
        saveCurrentProject(); 
        alert("Project saved successfully!");
        renderProject(); 
    });

    calendarsView.addEventListener('click', (e) => {
        const clickedCell = e.target.closest('.date-cell');
        if (clickedCell) {
            const dateStr = clickedCell.dataset.date;
            const calendar = clickedCell.closest('.area-calendar');
            const areaName = calendar.querySelector('.calendar-header').textContent;
            
            const tasksForDayAndArea = projectDeadlines.filter(task => {
                const start = new Date(task.startDate);
                const end = new Date(task.endDate);
                const cellDate = new Date(dateStr);
                start.setHours(0,0,0,0);
                end.setHours(0,0,0,0);
                cellDate.setHours(0,0,0,0);
                return cellDate >= start && cellDate <= end && task.area === areaName;
            });

            if (tasksForDayAndArea.length > 0) {
                popupDate.textContent = `${formatDateForDisplay(dateStr)} - ${areaName}`;
                popupTaskList.innerHTML = '';
                tasksForDayAndArea.forEach(task => {
                    const teamClass = defaultTeams.includes(task.team) ? task.team.split(' ')[0].replace(/[^a-zA-Z]/g, '') : 'Other';
                    const listItem = document.createElement('li');
                    listItem.className = `task-item ${teamClass}`;
                    listItem.innerHTML = `
                        <div class="task-details">
                            <strong>${task.team}</strong>
                            <span>Start: ${formatDateForDisplay(task.startDate)} - End: ${formatDateForDisplay(task.endDate)}</span>
                        </div>
                    `;
                    popupTaskList.appendChild(listItem);
                });
                taskPopup.style.display = 'block';
            }
        }
    });

    closePopupBtn.addEventListener('click', () => {
        taskPopup.style.display = 'none';
    });

    window.addEventListener('click', (e) => {
        if (e.target === taskPopup) {
            taskPopup.style.display = 'none';
        }
    });
});
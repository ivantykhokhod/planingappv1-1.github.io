let data = JSON.parse(localStorage.getItem('skillTrackerDB')) || {
    skills: [],
    templates: [{ id: 1, name: "План на кожен день", goals: ["Підготувати план", "Придумати ідеї", "Аналізувати старе"] }]
};

let currentSkillId = data.skills.length > 0 ? data.skills[0].id : null;
let isArchiveOpen = false;
let activeDropdown = null; // Для закриття меню при кліку в інше місце

function saveData() { localStorage.setItem('skillTrackerDB', JSON.stringify(data)); }

// Закриття меню при кліку будь-де на сторінці
document.addEventListener('click', () => {
    if (activeDropdown) { activeDropdown.classList.remove('show'); activeDropdown = null; }
});

function toggleMenu(e, id) {
    e.stopPropagation(); // Щоб не спрацював клік по самій задачі/навичці
    const dropdown = document.getElementById(id);
    if (activeDropdown && activeDropdown !== dropdown) activeDropdown.classList.remove('show');
    dropdown.classList.toggle('show');
    activeDropdown = dropdown.classList.contains('show') ? dropdown : null;
}

// --- РЕНДЕР НАВИЧОК ---
function renderSkills() {
    const list = document.getElementById('skills-list');
    list.innerHTML = '';
    data.skills.forEach(skill => {
        const li = document.createElement('li');
        if (skill.id === currentSkillId) li.classList.add('active');
        
        li.innerHTML = `
            <span style="flex:1" onclick="selectSkill(${skill.id})">${skill.name}</span>
            <div class="actions-menu">
                <button class="actions-btn" onclick="toggleMenu(event, 'menu-skill-${skill.id}')">⋮</button>
                <div id="menu-skill-${skill.id}" class="dropdown">
                    <div class="dropdown-item" onclick="editSkill(event, ${skill.id})">✏️ Редагувати</div>
                    <div class="dropdown-item delete" onclick="deleteSkill(event, ${skill.id})">🗑️ Видалити</div>
                </div>
            </div>
        `;
        list.appendChild(li);
    });
}

function selectSkill(id) { currentSkillId = id; renderSkills(); renderGoals(); }

// --- РЕНДЕР ЦІЛЕЙ ---
function renderGoals() {
    const activeContainer = document.getElementById('active-goals');
    const archiveList = document.getElementById('archive-list');
    const title = document.getElementById('skill-title');
    const archCount = document.getElementById('archive-count');

    activeContainer.innerHTML = ''; archiveList.innerHTML = '';
    const skill = data.skills.find(s => s.id === currentSkillId);
    if (!skill) { title.textContent = "Створіть навичку"; return; }
    title.textContent = skill.name;

    let archivedItems = 0;

    function renderTree(goals, container, isArchiveView) {
        goals.forEach(goal => {
            if (isArchiveView) {
                if (goal.archived) {
                    archivedItems++; container.appendChild(createGoalUI(goal, true));
                }
                if (goal.children) renderTree(goal.children, container, isArchiveView);
            } else {
                if (!goal.archived) {
                    const node = createGoalUI(goal, false);
                    container.appendChild(node);
                    if (goal.children && goal.children.length > 0) {
                        const childrenDiv = document.createElement('div');
                        childrenDiv.className = 'goal-children';
                        renderTree(goal.children, childrenDiv, isArchiveView);
                        if (childrenDiv.hasChildNodes()) node.appendChild(childrenDiv);
                    }
                }
            }
        });
    }

    renderTree(skill.goals, activeContainer, false);
    renderTree(skill.goals, archiveList, true);
    archCount.textContent = archivedItems;
}

function createGoalUI(goal, isArchiveMode) {
    const node = document.createElement('div');
    node.className = 'goal-node';

    const item = document.createElement('div');
    item.className = `goal-item ${goal.type}`;

    item.innerHTML = `
        <div class="check-box ${goal.completed ? 'checked' : ''}" onclick="toggleComplete(${goal.id})"></div>
        <span class="goal-text ${goal.completed ? 'completed' : ''}">${goal.text}</span>
        <span class="archive-btn" onclick="toggleArchive(${goal.id})" title="${goal.archived ? 'Відновити' : 'В архів'}">${goal.archived ? '⟲' : '📦'}</span>
        <div class="actions-menu">
            <button class="actions-btn" onclick="toggleMenu(event, 'menu-goal-${goal.id}')">⋮</button>
            <div id="menu-goal-${goal.id}" class="dropdown">
                <div class="dropdown-item" onclick="editGoal(event, ${goal.id})">✏️ Редагувати</div>
                <div class="dropdown-item delete" onclick="deleteGoal(event, ${goal.id})">🗑️ Видалити</div>
            </div>
        </div>
    `;
    node.appendChild(item);
    return node;
}

// --- ФУНКЦІЇ ДІЙ (Навички та Цілі) ---
function toggleComplete(id) {
    const goal = findGoalByIdGlobally(id);
    if(goal) { goal.completed = !goal.completed; saveData(); renderGoals(); }
}

function toggleArchive(id) {
    const goal = findGoalByIdGlobally(id);
    if(goal) { goal.archived = !goal.archived; saveData(); renderGoals(); }
}

function addSkill() {
    const name = prompt("Назва навички:");
    if (name) {
        data.skills.push({ id: Date.now(), name, goals: [] });
        currentSkillId = data.skills[data.skills.length - 1].id;
        saveData(); renderSkills(); renderGoals();
    }
}

function editSkill(e, id) {
    e.stopPropagation();
    const skill = data.skills.find(s => s.id === id);
    const newName = prompt("Нова назва навички:", skill.name);
    if (newName && newName.trim() !== "") { skill.name = newName; saveData(); renderSkills(); renderGoals(); }
    if(activeDropdown) activeDropdown.classList.remove('show');
}

function deleteSkill(e, id) {
    e.stopPropagation();
    if (confirm("Ви впевнені, що хочете видалити цю навичку з усіма цілями?")) {
        data.skills = data.skills.filter(s => s.id !== id);
        if (currentSkillId === id) currentSkillId = data.skills.length > 0 ? data.skills[0].id : null;
        saveData(); renderSkills(); renderGoals();
    }
}

function promptNewGoal(type) {
    if (!currentSkillId) return alert("Спочатку створіть навичку!");
    const text = prompt(`Введіть назву цілі (${type}):`);
    if (!text) return;

    const skill = data.skills.find(s => s.id === currentSkillId);
    const newGoal = { id: Date.now(), text, type, completed: false, archived: false, children: [] };

    if (type !== 'long' && skill.goals.length > 0) {
        const parentName = prompt("Вкласти в яку ціль? (Введіть частину назви або залиште пустим):");
        if (parentName) {
            const parent = findGoalByName(skill.goals, parentName);
            if (parent) { parent.children.push(newGoal); saveData(); renderGoals(); return; }
        }
    }
    skill.goals.push(newGoal); saveData(); renderGoals();
}

function editGoal(e, id) {
    e.stopPropagation();
    const goal = findGoalByIdGlobally(id);
    if (goal) {
        const newText = prompt("Редагувати ціль:", goal.text);
        if (newText && newText.trim() !== "") { goal.text = newText; saveData(); renderGoals(); }
    }
    if(activeDropdown) activeDropdown.classList.remove('show');
}

function deleteGoal(e, id) {
    e.stopPropagation();
    const skill = data.skills.find(s => s.id === currentSkillId);
    
    // Рекурсивна функція видалення
    function removeGoal(goalsList, targetId) {
        for (let i = 0; i < goalsList.length; i++) {
            if (goalsList[i].id === targetId) {
                if (goalsList[i].children && goalsList[i].children.length > 0) {
                    if (!confirm("Ця ціль має підзадачі. Видалити їх усі?")) return false;
                } else {
                    if (!confirm("Видалити цю ціль?")) return false;
                }
                goalsList.splice(i, 1);
                return true;
            }
            if (goalsList[i].children && removeGoal(goalsList[i].children, targetId)) return true;
        }
        return false;
    }

    if (removeGoal(skill.goals, id)) { saveData(); renderGoals(); }
    if(activeDropdown) activeDropdown.classList.remove('show');
}

function findGoalByName(goals, name) {
    for (let g of goals) {
        if (!g.archived && g.text.toLowerCase().includes(name.toLowerCase())) return g;
        if (g.children) { const res = findGoalByName(g.children, name); if (res) return res; }
    }
    return null;
}

function findGoalByIdGlobally(id) {
    const skill = data.skills.find(s => s.id === currentSkillId);
    if(!skill) return null;
    function search(goals) {
        for(let g of goals) {
            if(g.id === id) return g;
            if(g.children) { let res = search(g.children); if(res) return res; }
        }
        return null;
    }
    return search(skill.goals);
}

function toggleArchiveVisibility() {
    isArchiveOpen = !isArchiveOpen;
    document.getElementById('archive-list').classList.toggle('hidden');
    document.getElementById('archive-toggle-icon').textContent = isArchiveOpen ? '▲' : '▼';
}

// --- ЛОГІКА ШАБЛОНІВ ---
function openTemplateModal() {
    if (!currentSkillId) return alert("Спочатку створіть навичку!");
    document.getElementById('template-modal').classList.remove('hidden');
    renderMyTemplates(); fillParentSelect();
}

function closeTemplateModal() {
    document.getElementById('template-modal').classList.add('hidden');
    document.getElementById('create-template-form').classList.add('hidden');
}

function toggleCreateTemplateForm() { document.getElementById('create-template-form').classList.toggle('hidden'); }

function addInputToTemplate() {
    const container = document.getElementById('tpl-goals-list');
    const input = document.createElement('input');
    input.type = 'text'; input.className = 'tpl-goal-input'; input.placeholder = "Короткострокова ціль (підзадача)";
    container.appendChild(input);
}

function saveNewTemplate() {
    const name = document.getElementById('tpl-name').value;
    const inputs = document.querySelectorAll('.tpl-goal-input');
    const goals = Array.from(inputs).map(i => i.value).filter(v => v.trim() !== "");

    if (!name || goals.length === 0) return alert("Введіть назву та мінімум одну ціль!");

    data.templates.push({ id: Date.now(), name, goals });
    saveData();
    document.getElementById('tpl-name').value = '';
    inputs.forEach((input, index) => { if(index > 1) input.remove(); else input.value = ''; });
    document.getElementById('create-template-form').classList.add('hidden');
    renderMyTemplates();
}

function renderMyTemplates() {
    const list = document.getElementById('my-templates-list');
    list.innerHTML = '';
    data.templates.forEach(tpl => {
        const li = document.createElement('li');
        li.innerHTML = `
            <span style="flex:1" onclick="applyTemplate(${tpl.id})">${tpl.name} (${tpl.goals.length} цілей)</span>
            <div class="actions-menu">
                <button class="actions-btn" onclick="toggleMenu(event, 'menu-tpl-${tpl.id}')">⋮</button>
                <div id="menu-tpl-${tpl.id}" class="dropdown">
                    <div class="dropdown-item" onclick="editTemplate(event, ${tpl.id})">✏️ Редагувати назву</div>
                    <div class="dropdown-item delete" onclick="deleteTemplate(event, ${tpl.id})">🗑️ Видалити</div>
                </div>
            </div>
        `;
        list.appendChild(li);
    });
}

function editTemplate(e, id) {
    e.stopPropagation();
    const tpl = data.templates.find(t => t.id === id);
    const newName = prompt("Нова назва шаблону:", tpl.name);
    if (newName && newName.trim() !== "") { tpl.name = newName; saveData(); renderMyTemplates(); }
    if(activeDropdown) activeDropdown.classList.remove('show');
}

function deleteTemplate(e, id) {
    e.stopPropagation();
    if (confirm("Видалити цей шаблон?")) {
        data.templates = data.templates.filter(t => t.id !== id);
        saveData(); renderMyTemplates();
    }
    if(activeDropdown) activeDropdown.classList.remove('show');
}

function fillParentSelect() {
    const select = document.getElementById('parent-goal-select');
    select.innerHTML = '<option value="root">Без прикріплення (в корінь)</option>';
    const skill = data.skills.find(s => s.id === currentSkillId);
    if (!skill) return;

    function addOptions(goals, prefix = "") {
        goals.forEach(g => {
            if (g.archived) return;
            const opt = document.createElement('option');
            opt.value = g.id; opt.textContent = prefix + g.text; select.appendChild(opt);
            if (g.children) addOptions(g.children, prefix + "— ");
        });
    }
    addOptions(skill.goals);
}

function applyTemplate(id) {
    const tpl = data.templates.find(t => t.id === id);
    const skill = data.skills.find(s => s.id === currentSkillId);
    const parentId = document.getElementById('parent-goal-select').value;
    
    let targetList = skill.goals;
    if (parentId !== 'root') {
        const parent = findGoalByIdGlobally(parseInt(parentId));
        if (parent) targetList = parent.children;
    }

    const midGoal = { id: Date.now(), text: tpl.goals[0], type: 'mid', completed: false, archived: false, children: [] };
    for (let i = 1; i < tpl.goals.length; i++) {
        midGoal.children.push({ id: Date.now() + i, text: tpl.goals[i], type: 'short', completed: false, archived: false, children: [] });
    }

    targetList.push(midGoal); saveData(); renderGoals(); closeTemplateModal();
}

renderSkills();
if (currentSkillId) renderGoals();
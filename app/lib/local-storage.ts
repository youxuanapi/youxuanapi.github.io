import fs from 'fs';
import path from 'path';

const DATA_DIR = path.join(process.cwd(), 'data');
const PERSONAS_DIR = path.join(DATA_DIR, 'personas');
const TASKS_DIR = path.join(DATA_DIR, 'tasks');
const ARTICLES_DIR = path.join(DATA_DIR, 'articles');

function ensureDir(dirPath: string) {
  if (!fs.existsSync(dirPath)) {
    fs.mkdirSync(dirPath, { recursive: true });
  }
}

export async function savePersona(persona: any) {
  ensureDir(PERSONAS_DIR);
  const filePath = path.join(PERSONAS_DIR, `${persona.id}.json`);
  fs.writeFileSync(filePath, JSON.stringify(persona, null, 2), 'utf-8');
  return persona;
}

export async function loadPersonas() {
  ensureDir(PERSONAS_DIR);
  const files = fs.readdirSync(PERSONAS_DIR);
  const personas: any[] = [];
  
  for (const file of files) {
    if (file.endsWith('.json')) {
      try {
        const content = fs.readFileSync(path.join(PERSONAS_DIR, file), 'utf-8');
        personas.push(JSON.parse(content));
      } catch (err) {
        console.error(`加载人格失败 ${file}:`, err);
      }
    }
  }
  
  return personas.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
}

export async function loadPersona(personaId: string) {
  const filePath = path.join(PERSONAS_DIR, `${personaId}.json`);
  if (!fs.existsSync(filePath)) {
    return null;
  }
  const content = fs.readFileSync(filePath, 'utf-8');
  return JSON.parse(content);
}

export async function deletePersona(personaId: string) {
  const filePath = path.join(PERSONAS_DIR, `${personaId}.json`);
  if (fs.existsSync(filePath)) {
    fs.unlinkSync(filePath);
  }
}

export async function updatePersona(personaId: string, updates: any) {
  const persona = await loadPersona(personaId);
  if (!persona) {
    return null;
  }
  const updatedPersona = { ...persona, ...updates, updatedAt: new Date().toISOString() };
  return await savePersona(updatedPersona);
}

export async function saveTask(task: any) {
  ensureDir(TASKS_DIR);
  const filePath = path.join(TASKS_DIR, `${task.id}.json`);
  fs.writeFileSync(filePath, JSON.stringify(task, null, 2), 'utf-8');
  return task;
}

export async function loadTasks() {
  ensureDir(TASKS_DIR);
  const files = fs.readdirSync(TASKS_DIR);
  const tasks: any[] = [];
  
  for (const file of files) {
    if (file.endsWith('.json')) {
      try {
        const content = fs.readFileSync(path.join(TASKS_DIR, file), 'utf-8');
        tasks.push(JSON.parse(content));
      } catch (err) {
        console.error(`加载任务失败 ${file}:`, err);
      }
    }
  }
  
  return tasks.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
}

export async function saveArticle(taskId: string, article: string) {
  ensureDir(ARTICLES_DIR);
  const filePath = path.join(ARTICLES_DIR, `${taskId}.txt`);
  fs.writeFileSync(filePath, article, 'utf-8');
  return filePath;
}

export async function loadArticle(taskId: string) {
  const filePath = path.join(ARTICLES_DIR, `${taskId}.txt`);
  if (!fs.existsSync(filePath)) {
    return null;
  }
  return fs.readFileSync(filePath, 'utf-8');
}

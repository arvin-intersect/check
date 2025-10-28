// src/types.ts
export interface Question {
    id: string;
    prompt: string;
    type: 'text' | 'textarea' | 'select' | 'multiselect' | 'number' | 'date' | 'file';
    is_required: boolean;
    options?: string[];
    order: number;
}

export interface Section {
    id: string;
    title: string;
    description: string | null;
    order: number;
    questions: Question[];
}

export interface Questionnaire {
    id: string;
    title: string;
    organization: string;
    status: "draft" | "published" | "closed";
    updated_at: string;
    owner: string;
    responses: number;
    completionRate: number;
    lastEdited: string;
    sections?: Section[];
}

export interface Client {
    id: string;
    name: string;
    domain: string | null;
    created_at: string;
    totalForms?: number;
    activeForms?: number;
    completedForms?: number;
    draftForms?: number;
    lastActivity?: string;
    logo?: string;
}

export interface Response {
    id: string;
    respondent_id: string;
    submitted_at: string;
    answers: Record<string, string | number | string[]>;
}

export interface Workshop {
  id: string;
  name: string;
  clientName: string;
  questionnaireId: string;
  status: 'draft' | 'in-progress' | 'completed';
  createdAt: string;
  updatedAt: string;
  insightCount: number;
}

export interface WorkshopBoard {
  id: string;
  name:string;
  description: string;
}

export interface Insight {
  id: string; // Corresponds to the original response answer's unique ID
  questionId: string;
  questionPrompt: string;
  sectionTitle: string;
  answer: string;
  respondentId: string;
  aiSummary: string;
  aiHeading: string;
  boardCategory?: string; // The ID of the WorkshopBoard it's assigned to
  tags: string[];
}
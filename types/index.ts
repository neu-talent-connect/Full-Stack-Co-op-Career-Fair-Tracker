// Core data types for the application

export interface Job {
  id: string;
  company: string;
  title: string;
  status: JobStatus;
  interest: number; // 1-5
  dateApplied?: string;
  deadline?: string;
  notes?: string;
  // Advanced fields
  jobId?: string;
  location?: string;
  salary?: string;
  applicationCycle?: string;
  datePosted?: string;
  contact?: string;
  contactEmail?: string;
  contactPhone?: string;
  resume?: ResumeVersion;
  coverLetter?: CoverLetterStatus;
  url?: string;
  createdAt: string;
  updatedAt: string;
}

export type JobStatus = 
  | 'Not Started' 
  | 'In Progress' 
  | 'Submitted' 
  | 'Under Review' 
  | 'Interview' 
  | 'Rejected' 
  | 'Offer';

export type ResumeVersion = 'None' | 'Standard' | 'Tailored';
export type CoverLetterStatus = 'None' | 'Required' | 'Submitted';

export interface Company {
  id: string;
  name: string;
  industry?: string;
  interest: number; // 1-5
  booth?: string;
  recruiter?: string;
  position?: string;
  optFriendly?: 'Yes' | 'No' | 'Case-by-case' | '';
  deadline?: string;
  notes?: string;
  createdAt: string;
}

export interface Contact {
  id: string;
  name: string;
  company?: string;
  position?: string;
  email?: string;
  linkedin?: string;
  phone?: string;
  type: ConnectionType;
  strength: RelationshipStrength;
  ranking?: number; // 1-5 rating
  isPinned?: boolean; // Favorite/pin system
  notes?: string;
  createdAt: string;
}

export type ConnectionType = 
  | 'Career Fair' 
  | 'Alumni' 
  | 'Faculty' 
  | 'Referral' 
  | 'Cold Outreach' 
  | 'Event';

export type RelationshipStrength = 'Cold' | 'Warm' | 'Hot';

export interface FollowUp {
  id: string;
  company: string;
  contact?: string;
  type: FollowUpType;
  dueDate: string;
  priority: Priority;
  status: FollowUpStatus;
  createdAt: string;
}

export type FollowUpType = 
  | 'Thank You' 
  | 'Check-in' 
  | 'Application Status' 
  | 'LinkedIn Connection';

export type Priority = 'High' | 'Medium' | 'Low';
export type FollowUpStatus = 'Pending' | 'Completed';

export interface Interview {
  id: string;
  jobId: string;
  company: string;
  position: string;
  type: InterviewType;
  date: string;
  time?: string;
  location?: string;
  interviewers?: string;
  notes?: string;
  status: InterviewStatus;
  createdAt: string;
}

export type InterviewType = 
  | 'Phone Screen' 
  | 'Video Call' 
  | 'On-site' 
  | 'Technical' 
  | 'Behavioral' 
  | 'Panel';

export type InterviewStatus = 'Scheduled' | 'Completed' | 'Cancelled';

export interface ResearchCompany {
  company: string;
  position?: string;
  interest: number; // 0-5
}

export type OutreachStatus = 'To Reach Out' | 'Reached Out' | 'Waiting for Reply';

export interface ResearchContact {
  id: string;
  name: string;
  linkedin?: string;
  companies: ResearchCompany[];
  interest: number; // 0-5 overall
  outreachStatus: OutreachStatus;
  notes?: string;
  createdAt: string;
}

// Application data structure
export interface AppData {
  companies: Company[];
  contacts: Contact[];
  jobs: Job[];
  followups: FollowUp[];
  interviews: Interview[];
  researchContacts: ResearchContact[];
}

// Statistics for dashboard
export interface DashboardStats {
  totalApplications: number;
  submitted: number;
  interviews: number;
  offers: number;
  statusBreakdown: Record<JobStatus, number>;
  interestLevelBreakdown: Record<number, number>;
  monthlyActivity: { month: string; count: number }[];
}

// Filter options for dashboard
export interface DashboardFilters {
  applicationCycle?: string;
  status?: JobStatus | '';
  interest?: number | '';
  search?: string;
}

// Column visibility settings
export interface ColumnSettings {
  [key: string]: {
    visible: boolean;
    order: number;
  };
}

// User preferences
export interface UserPreferences {
  darkMode: boolean;
  dateFormat: 'numeric' | 'short' | 'relative';
  columnSettings: ColumnSettings;
}

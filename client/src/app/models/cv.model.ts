export interface CvExperience {
  [key: string]: any;
  title?: string;
  company?: string;
  startDate?: string;
  endDate?: string;
  description?: string;
}

export interface CvEducation {
  [key: string]: any;
  school?: string;
  degree?: string;
  startDate?: string;
  endDate?: string;
  description?: string;
}

export interface UserProfile {
  aboutMe: string;
  experiences: CvExperience[];
  education: CvEducation[];
  languages: string[];
  software: string[];
  // Champs optionnels (compat backend)
  phone?: string;
  address?: string;
  linkedin?: string;
}

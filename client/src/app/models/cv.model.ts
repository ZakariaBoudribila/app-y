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

export interface LanguageLevel {
  name: string;
  percent: number;
}

export interface UserProfile {
  aboutMe: string;
  experiences: CvExperience[];
  education: CvEducation[];
  languages: string[];
  languagesLevels?: LanguageLevel[];
  software: string[];
  // Champs optionnels (compat backend)
  phone?: string;
  address?: string;
  linkedin?: string;
}

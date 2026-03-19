export interface ProfessionalProfile {
  jobTitle?: string;
  headline?: string;
  pdfSectionsOrder?: string[];
  pdfSectionsLayout?: { left: string[]; right: string[] };
  aboutMe: string;
  experiences: Array<Record<string, any>>;
  education: Array<Record<string, any>>;
  languages: string[];
  software: string[];
  skills?: string[];
  projects?: Array<Record<string, any>>;
  certifications?: Array<Record<string, any>>;
  interests?: string[];
  links?: Array<Record<string, any>>;
  phone?: string;
  address?: string;
  linkedin?: string;
}

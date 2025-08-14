import { ResearchNode, CoachProgram, Principle, GoalGuideline, SexSpecific, CoachPersona, isPrinciple, isCoachProgram, isGoalGuideline, isSexSpecific, isCoachPersona } from '@/types/research-types';
import researchData from '@/data/research-data.json';
import coachPersonasData from '@/data/coach-personas.json';

/**
 * Central manager for research-based workout methodology data
 */
export class ResearchDataManager {
  private data: ResearchNode[];

  constructor() {
    // Only use research data - coach personas are now simplified
    this.data = [
      ...(researchData as ResearchNode[])
    ];
  }

  /**
   * Get all available coach programs
   */
  getCoachPrograms(): CoachProgram[] {
    return this.data.filter(isCoachProgram);
  }

  /**
   * Get principles relevant for a specific goal
   */
  getPrinciplesForGoal(goal: string): Principle[] {
    return this.data.filter(isPrinciple).filter(p => 
      p.tags.includes(goal) || p.tags.includes('universal')
    );
  }

  /**
   * Get goal-specific guidelines
   */
  getGoalGuidelines(goal?: string): GoalGuideline[] {
    const guidelines = this.data.filter(isGoalGuideline);
    return goal ? guidelines.filter(g => g.goal === goal) : guidelines;
  }

  /**
   * Get sex-specific adjustments
   */
  getSexSpecificAdjustments(sex: 'male' | 'female'): SexSpecific | undefined {
    return this.data.filter(isSexSpecific).find(s => s.sex === sex);
  }

  /**
   * Get all coach personas
   */
  getCoachPersonas(): CoachPersona[] {
    return this.data.filter(isCoachPersona);
  }

  /**
   * Find persona by coach name
   */
  findPersonaByCoach(coachName: string): CoachPersona | undefined {
    return this.data.filter(isCoachPersona).find(p => p.coachName === coachName);
  }

  /**
   * Smart program selection based on user profile and coach persona
   */
  selectProgramForUser(userProfile: {
    goal?: string;
    sex?: 'male' | 'female';
    experience?: 'beginner' | 'intermediate' | 'advanced';
    experienceYears?: number;
    timePerSessionMin?: number;
    injury?: boolean;
    likesPump?: boolean;
    likesPeriodization?: boolean;
  }, persona: CoachPersona): string {
    const { experienceYears = 0, timePerSessionMin = 60, injury = false, goal, likesPump, likesPeriodization } = userProfile;

    // Hard gates for primary program (Markus Rühl specific)
    if (persona.id === "persona_ruhl") {
      const meetsRuhlRequirements = 
        experienceYears >= 3 &&
        goal === "hypertrophy" &&
        timePerSessionMin >= 90 &&
        !injury;

      if (meetsRuhlRequirements) {
        return persona.primaryProgram;
      }
    }

    // Fallback logic based on constraints
    for (const fallbackId of persona.fallbackPrograms) {
      if (fallbackId === "cp_yates" && timePerSessionMin >= 45 && timePerSessionMin < 90) {
        return fallbackId;
      }
      if (fallbackId === "cp_mentzer" && timePerSessionMin <= 30 && experienceYears >= 1) {
        return fallbackId;
      }
      if (fallbackId === "cp_israetel" && likesPeriodization && timePerSessionMin >= 60) {
        return fallbackId;
      }
      if (fallbackId === "cp_meadows" && likesPump && experienceYears >= 2) {
        return fallbackId;
      }
    }

    // Default fallback to primary program
    return persona.primaryProgram;
  }

  /**
   * Find suitable coach programs for user profile
   */
  getSuitablePrograms(userProfile: {
    goal?: string;
    sex?: 'male' | 'female';
    experience?: 'beginner' | 'intermediate' | 'advanced';
    timeAvailable?: number; // hours per week
  }): CoachProgram[] {
    const { goal, sex, experience, timeAvailable } = userProfile;
    
    // Start with all coach programs
    let suitablePrograms = this.getCoachPrograms();

    // Filter by goal if specified
    if (goal) {
      const goalGuideline = this.getGoalGuidelines(goal)[0];
      if (goalGuideline) {
        suitablePrograms = suitablePrograms.filter(program =>
          goalGuideline.suitablePrograms.includes(program.id)
        );
      }
    }

    // Filter by experience level (based on tags)
    if (experience === 'beginner') {
      suitablePrograms = suitablePrograms.filter(program =>
        !program.tags.includes('advanced') && !program.tags.includes('hit')
      );
    } else if (experience === 'advanced') {
      // Advanced users can handle any program
    }

    // Filter by time availability
    if (timeAvailable && timeAvailable < 4) {
      // For limited time, prefer time-efficient programs
      suitablePrograms = suitablePrograms.filter(program =>
        program.tags.includes('time-efficient') || 
        program.tags.includes('hit') ||
        program.id === 'cp_mentzer'
      );
    }

    return suitablePrograms;
  }

  /**
   * Generate training recommendations based on research data
   */
  generateRecommendations(userProfile: {
    goal?: string;
    sex?: 'male' | 'female';
    experience?: 'beginner' | 'intermediate' | 'advanced';
  }): {
    principles: Principle[];
    sexAdjustments?: SexSpecific;
    recommendedPrograms: CoachProgram[];
    guidelines?: GoalGuideline;
  } {
    const { goal, sex } = userProfile;

    const principles = goal ? this.getPrinciplesForGoal(goal) : this.data.filter(isPrinciple);
    const sexAdjustments = sex ? this.getSexSpecificAdjustments(sex) : undefined;
    const recommendedPrograms = this.getSuitablePrograms(userProfile);
    const guidelines = goal ? this.getGoalGuidelines(goal)[0] : undefined;

    return {
      principles,
      sexAdjustments,
      recommendedPrograms,
      guidelines
    };
  }

  /**
   * Search research data by tags
   */
  searchByTags(tags: string[]): ResearchNode[] {
    return this.data.filter(node =>
      tags.some(tag => node.tags.includes(tag))
    );
  }

  /**
   * Get detailed program information including principles
   */
  getProgramDetails(programId: string): {
    program?: CoachProgram;
    relevantPrinciples: Principle[];
  } {
    const program = this.getCoachPrograms().find(p => p.id === programId);
    
    if (!program) {
      return { relevantPrinciples: [] };
    }

    // Find principles that match the program's core principles
    const relevantPrinciples = this.data.filter(isPrinciple).filter(principle =>
      program.corePrinciples.some(core => 
        principle.name.toLowerCase().includes(core.toLowerCase()) ||
        core.toLowerCase().includes(principle.name.toLowerCase())
      )
    );

    return {
      program,
      relevantPrinciples
    };
  }

  /**
   * Format recommendations as structured text for LLM context
   */
  formatForLLMContext(userProfile: {
    goal?: string;
    sex?: 'male' | 'female';
    experience?: 'beginner' | 'intermediate' | 'advanced';
  }): string {
    const recommendations = this.generateRecommendations(userProfile);
    
    let context = `# Research-Based Training Recommendations\n\n`;
    
    // Principles
    if (recommendations.principles.length > 0) {
      context += `## Core Training Principles:\n`;
      recommendations.principles.forEach(principle => {
        context += `- **${principle.name}**: ${principle.description}\n`;
        if (principle.recommended.typical) {
          context += `  Recommended: ${principle.recommended.typical} ${principle.recommended.unit || ''}\n`;
        }
      });
      context += `\n`;
    }

    // Sex-specific adjustments
    if (recommendations.sexAdjustments) {
      context += `## Sex-Specific Adjustments (${recommendations.sexAdjustments.sex}):\n`;
      context += `${recommendations.sexAdjustments.description}\n`;
      Object.entries(recommendations.sexAdjustments.adjustments).forEach(([key, value]) => {
        context += `- ${key}: ${value}\n`;
      });
      context += `\n`;
    }

    // Recommended programs
    if (recommendations.recommendedPrograms.length > 0) {
      context += `## Suitable Training Programs:\n`;
      recommendations.recommendedPrograms.forEach(program => {
        context += `### ${program.coach} - ${program.alias || program.coach}\n`;
        context += `Core Principles: ${program.corePrinciples.join(', ')}\n`;
        if (program.notes) {
          context += `Notes: ${program.notes}\n`;
        }
        if (program.splitExample) {
          context += `Example Split: ${program.splitExample}\n`;
        }
        context += `\n`;
      });
    }

    return context;
  }
}

// Export singleton instance
export const researchDataManager = new ResearchDataManager();
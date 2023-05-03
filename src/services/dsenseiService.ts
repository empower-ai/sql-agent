import dataQuestionAgent from '@/agent/data-question-agent';
import { type Answer } from '@/agent/types';

class DSenseiService {
  async answer(question: string, conversationId: string, providedAssumptions: string | null = null): Promise<Answer> {
    const answer = await dataQuestionAgent.answer(question, conversationId);
    return answer;
  }
}

const dSenseiService = new DSenseiService();
export default dSenseiService;

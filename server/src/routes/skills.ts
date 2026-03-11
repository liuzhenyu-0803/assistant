import { Router } from 'express';
import type { Router as ExpressRouter } from 'express';
import type { SkillListItem } from '@assistant/shared';
import { skillLoader } from '../skills/skill-loader.js';

const router: ExpressRouter = Router();

router.get('/', (_req, res, next) => {
  try {
    const skills: SkillListItem[] = skillLoader.getAllSkillMetas().map((skill) => ({
      name: skill.name,
      description: skill.description,
      match: skill.match,
      path: skill.path,
    }));

    res.json({ data: skills });
  } catch (error) {
    next(error);
  }
});

export { router as skillsRouter };

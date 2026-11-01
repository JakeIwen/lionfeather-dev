import { pickDefaultModel } from '../claude/model-catalog.mjs'
import { safeError } from '../safe-error.mjs'
import { sendJson } from './json.mjs'

export const DEFAULT_EFFORT = 'high'

export function createModelsRoute({ catalog }) {
  return async function modelsRoute(_req, res) {
    let models
    try {
      models = await catalog.list()
    } catch (error) {
      return sendJson(res, 502, { error: safeError(error) })
    }
    sendJson(res, 200, {
      models: models.map(({ id, label, efforts }) => ({ id, label, efforts })),
      defaultModel: pickDefaultModel(models),
      defaultEffort: DEFAULT_EFFORT,
    })
  }
}

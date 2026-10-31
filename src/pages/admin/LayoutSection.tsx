import { additionalWork } from '../../content/additionalWork'
import {
  homeSectionLabels,
  selectedWorkLabels,
  type HomeSectionId,
  type SelectedWorkId,
} from '../../settings/siteSettings'
import { FeaturedArticleSelect } from './FeaturedArticleSelect'
import { OrderedListEditor } from './OrderedListEditor'
import { SettingsActions } from './SettingsActions'
import { Switch } from './Switch'
import { useSiteSettingsDraft } from './useSiteSettingsDraft'
import './admin.css'

const additionalWorkTitles = new Map(
  additionalWork.map((item) => [item.id, item.title]),
)

export function LayoutSection() {
  const { draft, dirty, loadError, status, change, revert, save } =
    useSiteSettingsDraft()
  return (
    <section className="admin-section" aria-labelledby="layout-title">
      <div className="admin-section-head">
        <h2 id="layout-title">Layout</h2>
      </div>
      {loadError ? (
        <p className="admin-error" role="alert">
          {loadError}
        </p>
      ) : null}
      {draft ? (
        <>
          <div className="admin-stack">
            <OrderedListEditor<HomeSectionId>
              title="Homepage sections"
              items={draft.homeSections}
              labelFor={(id) => homeSectionLabels[id]}
              onChange={(homeSections) => change({ homeSections })}
            />
            <OrderedListEditor<SelectedWorkId>
              title="Selected work"
              items={draft.selectedWork}
              labelFor={(id) => selectedWorkLabels[id]}
              onChange={(selectedWork) => change({ selectedWork })}
            />
            <OrderedListEditor
              title="Additional work"
              items={draft.additionalWork}
              labelFor={(id) => additionalWorkTitles.get(id) ?? id}
              onChange={(items) => change({ additionalWork: items })}
            />
            <FeaturedArticleSelect
              value={draft.featuredArticle}
              onChange={(featuredArticle) => change({ featuredArticle })}
            />
            <Switch
              label="Collect analytics on the public site"
              checked={draft.analytics.enabled}
              onChange={(enabled) => change({ analytics: { enabled } })}
            />
          </div>
          <SettingsActions
            dirty={dirty}
            status={status}
            onSave={() => void save()}
            onRevert={revert}
          />
        </>
      ) : loadError ? null : (
        <p className="admin-note">Loading settings…</p>
      )}
    </section>
  )
}

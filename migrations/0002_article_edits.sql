-- Articles the owner edited on the site: value holds the ArticleEditFields JSON
-- (title, dek, tags, published, markdown). A row replaces the version in
-- src/content/articles.ts; deleting it brings the code's version back.
CREATE TABLE article_edits (
  slug TEXT PRIMARY KEY,
  value TEXT NOT NULL,
  updated_at INTEGER NOT NULL
);

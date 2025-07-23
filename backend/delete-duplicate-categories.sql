DELETE FROM "categories"
WHERE id NOT IN (
  SELECT MIN(id)
  FROM "categories"
  GROUP BY name
); 
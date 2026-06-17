export function greenhouseJob(id, title, location) {
  return {
    id,
    title,
    absolute_url: `https://boards.greenhouse.io/acme/jobs/${id}`,
    location: { name: location },
  };
}

export function leverJob(id, text, location, applyUrl) {
  return {
    id,
    text,
    hostedUrl: `https://jobs.lever.co/acme/${id}`,
    applyUrl,
    categories: { location },
  };
}

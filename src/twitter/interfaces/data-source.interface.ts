export interface ITwitterStreamPost {
  id: string,
  text: string,
  author_id: string,
  created_at: string,
  entities: {
    hashtags: string[],
  }
}
export interface RegisterRequest {
    email: string;
    password: string;
}
export interface LoginRequest {
    email: string;
    password: string;
}
export interface AuthTokens {
    access_token: string;
    refresh_token: string;
    user_id: string;
}
export interface UserProfile {
    id: string;
    email: string;
    username?: string;
    bio?: string;
    avatar_url?: string;
    created_at: string;
}
export interface Blog {
    id: string;
    title: string;
    content: string;
    author_id: string;
    created_at: string;
    updated_at: string;
}
export interface CreateBlogRequest {
    title: string;
    content: string;
}
export interface BlogListResponse {
    blogs: Blog[];
    total: number;
}
export interface Comment {
    id: string;
    content: string;
    blog_id: string;
    author_id: string;
    created_at: string;
}
export interface CreateCommentRequest {
    content: string;
}
export interface ApiError {
    statusCode: number;
    message: string;
    error?: string;
}
export interface PaginationQuery {
    page?: number;
    limit?: number;
}
//# sourceMappingURL=index.d.ts.map
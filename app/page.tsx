import { BlogForm } from "@/components/blog-form/BlogForm";

export default function Home() {
  return (
    <main className="min-h-screen bg-gray-50 py-6 sm:py-12 px-4">
      <div className="max-w-3xl mx-auto">
        <h1 className="text-xl sm:text-2xl font-bold text-gray-900 text-center mb-1 sm:mb-2">
          네이버 맛집 블로그 글 생성기
        </h1>
        <p className="text-sm sm:text-base text-gray-500 text-center mb-6 sm:mb-8">
          가게 정보와 이미지를 입력하면 네이버 블로그에 바로 붙여넣을 수 있는 맛집 리뷰를 생성합니다.
        </p>
        <BlogForm />
      </div>
    </main>
  );
}

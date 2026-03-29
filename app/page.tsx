import Image from "next/image";
import { BlogForm } from "@/components/blog-form/BlogForm";

export default function Home() {
  return (
    <main className="min-h-screen bg-gray-50 py-6 sm:py-12 px-4">
      <div className="max-w-3xl mx-auto">
        <div className="flex items-center justify-center gap-2 mb-1 sm:mb-2">
          <Image src="/logo.png" alt="블로그펜" width={36} height={36} className="rounded-lg" />
          <h1 className="text-xl sm:text-2xl font-bold text-gray-900">
            블로그펜
          </h1>
        </div>
        <p className="text-sm sm:text-base text-gray-500 text-center mb-6 sm:mb-8">
          사진과 가게 정보만 넣으면, 블로그 리뷰가 완성됩니다
        </p>
        <BlogForm />
      </div>
    </main>
  );
}

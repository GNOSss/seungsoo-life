// 아이폰 15 Pro Max 뷰포트(430x932)에 맞춘 세로형 로딩 애니메이션.
// 그보다 작은 화면에서는 뷰포트에 맞춰 축소되고, 데스크탑처럼 큰 화면에서는
// 430x932를 넘기지 않고 화면 정중앙에 그 크기 그대로 고정된다.
export function LoadingScreen() {
  return (
    <div className="flex h-screen w-full items-center justify-center bg-white">
      <img
        src="/217720.gif"
        alt="로딩 중"
        className="h-[min(932px,100vh)] w-[min(430px,100vw)] object-contain"
      />
    </div>
  )
}

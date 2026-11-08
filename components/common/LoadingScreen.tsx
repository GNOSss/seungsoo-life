// 나중에 캐릭터 애니메이션으로 교체하려면:
// 1. public/loading-character.gif (또는 .json for Lottie) 추가
// 2. 아래 placeholder <div> 를 <img src="/loading-character.gif" /> 로 교체

export function LoadingScreen() {
  return (
    <div className="flex h-[60vh] w-full items-center justify-center">
      <div className="size-10 animate-bounce rounded-md bg-neutral-800" />
    </div>
  )
}

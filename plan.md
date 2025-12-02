1단계: Live2D 모델 웹에 띄우기 (Rendering)
가장 먼저 할 일은 React 화면에 히요리가 숨 쉬며 서 있게 만드는 것입니다.

핵심 라이브러리: pixi.js, pixi-live2d-display (이 조합이 리액트에서 가장 안정적입니다.)

할 일:

스크린샷의 hiyori_free_en 폴더 전체를 프로젝트의 public 폴더로 이동시키세요. (Vite/Webpack이 빌드할 때 경로 문제 없이 로드하기 위함입니다.)

PixiJS 캔버스를 만들고 Live2DModel.from('.../hiyori_free_t08.model3.json')을 통해 모델을 로드합니다.

마우스 움직임에 따라 시선이 따라오는지 확인합니다.

2단계: AI "뇌" 연결하기 (LLM Integration)
캐릭터가 대답을 해야 합니다. 처음에는 가장 쉬운 OpenAI API를 추천합니다.

기술: OpenAI API (gpt-4o-mini 추천 - 빠르고 저렴함), 또는 LangChain.js

프롬프트 엔지니어링 (중요):

AI에게 "너는 버튜버 히요리야. 귀엽고 활기차게 대답해."라는 System Prompt를 줘야 합니다.

감정 태그: 답변을 받을 때 감정을 같이 뱉도록 해야 합니다.

예: [Happy] 안녕하세요! 만나서 반가워요!

이렇게 받아야 나중에 모션을 트리거할 수 있습니다.

3단계: 목소리 및 립싱크 (TTS & Lip-sync) (가장 어려운 부분)
캐릭터가 말할 때 입을 맞춰야 리얼합니다.

기술:

TTS: OpenAI TTS, ElevenLabs (퀄리티 좋음), 또는 브라우저 기본 TTS (무료).

립싱크 (Lip-sync):

오디오 파일을 재생할 때 Web Audio API를 사용해야 합니다.

AnalyserNode를 연결해 실시간으로 **볼륨 크기(Amplitude)**를 측정합니다.

볼륨이 크면 입을 크게 벌리고(ParamMouthOpen = 1.0), 작으면 다물게(0.0) 매 프레임 업데이트합니다.

4단계: 모션 및 표정 제어 (Motion Control)
LLM이 뱉은 감정 태그에 맞춰 움직임을 바꿉니다.

로직:

텍스트에 [Sad]가 포함됨 -> Live2D 모델의 motion 폴더에 있는 hiyori_m0?.motion3.json 중 슬픈 모션을 재생(motionManager.startMotion(...)).

동시에 표정 파라미터 변경.

---

npm install pixi.js@7.x pixi-live2d-display
npm install openai

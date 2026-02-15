# NFS 백업 정보

## NFS 마운트 설정

### Synology NAS
- **NAS IP**: 192.168.50.215
- **NFS Share**: /volume1/app
- **로컬 마운트**: /home/jclee/synology
- **프로토콜**: NFS4
- **권한**: rw (읽기/쓰기)

### 마운트 상태 확인
```bash
mount | grep nfs
# 192.168.50.215:/volume1/app on /home/jclee/synology type nfs4 (rw,relatime,vers=4.1,...)
```

## 백업 디렉토리 구조

```
/home/jclee/synology/resume/toss/
├── lee_jaecheol_toss_ai_automation_final.pdf (61KB) ⭐
├── lee_jaecheol_toss_ai_automation_with_emoji.pdf (108KB)
├── RESUME_FINAL.md
└── RESUME_FINAL_NO_EMOJI.md
```

## 백업 명령어

### 수동 백업
```bash
# 토스 이력서 백업
cp /home/jclee/app/resume/toss/*.pdf /home/jclee/synology/resume/toss/
cp /home/jclee/app/resume/toss/*.md /home/jclee/synology/resume/toss/
```

### 전체 이력서 백업
```bash
# 전체 resume 폴더 동기화
rsync -avh --progress /home/jclee/app/resume/ /home/jclee/synology/resume/
```

## 자동 백업 스크립트

```bash
#!/bin/bash
# NFS 자동 백업 스크립트

SOURCE="/home/jclee/app/resume/toss"
DEST="/home/jclee/synology/resume/toss"

# 디렉토리 생성
mkdir -p "$DEST"

# 파일 복사
cp "$SOURCE"/*.pdf "$DEST"/ 2>/dev/null
cp "$SOURCE"/*.md "$DEST"/ 2>/dev/null

# 백업 완료 메시지
echo "✅ NFS 백업 완료: $(date)"
ls -lh "$DEST"
```

## NFS 연결 상태 확인

```bash
# NFS 마운트 확인
df -h | grep synology

# NFS 연결 테스트
ls -lh /home/jclee/synology/

# 쓰기 권한 테스트
touch /home/jclee/synology/test.txt && rm /home/jclee/synology/test.txt
```

## 문제 해결

### NFS 마운트 재연결
```bash
# 마운트 해제
sudo umount /home/jclee/synology

# 재마운트
sudo mount -t nfs4 192.168.50.215:/volume1/app /home/jclee/synology
```

### 권한 문제
```bash
# NFS 서버(Synology)에서 설정:
# - NFS 권한: Squash: Map all users to admin
# - 접근 권한: RW
# - UID/GID 매핑 확인
```

## 최종 백업 일시

- **날짜**: 2025-09-30 20:18
- **파일 수**: 4개
- **총 용량**: ~188KB

---

**참고**: Synology NAS는 자동으로 스냅샷을 생성하므로 추가 버전 관리가 가능합니다.

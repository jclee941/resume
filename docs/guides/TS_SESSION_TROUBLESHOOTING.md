# TS Session Troubleshooting Guide

## 문제: 세션 생성 후 접속 안 됨

### 증상

```bash
$ ts create system
✓ TS Common Library loaded (v2.0.0-modular)
✓ TS Slack Integration loaded (v2.0.0-modular)
🚀 Creating session: system
🤖 Starting OpenCode in session...
✓ Session created: system
  Path: /home/jclee/app/system
[jclee@localhost ~]$  # 세션 접속 안 됨
```

### 원인

`ts` 명령어가 세션 생성 후 자동으로 `attach_session()`을 호출하지만, 터미널 환경에 따라 attach가 실패하거나 즉시
detach될 수 있습니다.

## 해결 방법

### 1. 수동 세션 접속

```bash
# 세션 목록 확인
ts list

# 특정 세션 접속
ts attach system

# 또는 tmux 직접 사용
tmux -S /home/jclee/.tmux/sockets/system attach-session -t system
```

### 2. 중복 세션 정리

```bash
# 중복 세션 감지 및 수정
ts sync

# Dead 세션 제거
ts delete gem  # 예: 'gem' 세션이 dead 상태인 경우
```

### 3. 세션 상태 확인

```bash
# 세션이 실행 중인지 확인
tmux -S /home/jclee/.tmux/sockets/system has-session -t system

# 소켓 파일 확인
ls -la /home/jclee/.tmux/sockets/

# tmux 프로세스 확인
ps aux | grep tmux | grep system
```

## 일반적인 문제들

### 문제 1: Session not found

```bash
error connecting to /home/jclee/.tmux/sockets/system (No such file or directory)
```

**원인**: 세션이 생성되지 않았거나 이미 종료됨

**해결**:

```bash
# 세션 재생성
ts create system

# 또는 직접 tmux로 생성
mkdir -p /home/jclee/app/system
tmux -S /home/jclee/.tmux/sockets/system new-session -s system -c /home/jclee/app/system
```

### 문제 2: Duplicate sessions detected

```bash
⚠️ Duplicate sessions detected!
```

**원인**: DB와 실제 tmux 세션이 불일치

**해결**:

```bash
# 동기화 명령 실행
ts sync

# 또는 수동으로 orphan 세션 정리
tmux -S /home/jclee/.tmux/sockets/old-session kill-session -t old-session
rm /home/jclee/.tmux/sockets/old-session
```

### 문제 3: OpenCode 자동 실행 실패

```bash
🤖 Starting OpenCode in session...
# OpenCode가 실행되지 않음
```

**원인**: `OpenCode` 명령어가 PATH에 없거나 실행 권한 문제

**해결**:

```bash
# 세션에 접속 후 수동 실행
ts attach system
OpenCode

# 또는 세션 생성 시 auto-OpenCode 비활성화
ts create system --no-OpenCode
```

## 개선된 워크플로우

### 추천 방법 1: 세션 생성 후 수동 접속

```bash
# 1. 세션 생성 (auto-attach 비활성화)
ts create myproject --no-OpenCode

# 2. 세션 상태 확인
ts list | grep myproject

# 3. 수동 접속
ts attach myproject
```

### 추천 방법 2: 세션 상태 확인 후 접속

```bash
# 1. 세션 생성
ts create myproject

# 2. 프로세스 확인
ps aux | grep "tmux.*myproject"

# 3. 소켓 확인
ls -la /home/jclee/.tmux/sockets/myproject

# 4. 접속
ts attach myproject
```

## TS 명령어 개선 제안

### 현재 동작

```bash
create_session() {
    # ... 세션 생성 ...

    # 자동 attach (문제 발생 가능)
    attach_session "$name"
}
```

### 개선안 1: Attach 실패 시 명확한 피드백

```bash
create_session() {
    # ... 세션 생성 ...

    # 자동 attach 시도
    if ! attach_session "$name"; then
        echo -e "${YELLOW}⚠️ Auto-attach failed. Try manually:${NC}"
        echo -e "${CYAN}  ts attach $name${NC}"
        return 1
    fi
}
```

### 개선안 2: 선택적 Auto-attach

```bash
# 플래그 추가
ts create myproject --no-attach

# 또는 환경 변수
export TS_AUTO_ATTACH=false
ts create myproject
```

### 개선안 3: Attach 전 세션 검증

```bash
create_session() {
    # ... 세션 생성 ...

    # 세션 생성 확인
    sleep 0.5
    if ! ts_session_exists "$name"; then
        echo -e "${RED}✗ Session creation failed${NC}"
        return 1
    fi

    # Attach 시도
    attach_session "$name"
}
```

## 디버깅 명령어

### 세션 상태 전체 확인

```bash
# 스크립트로 만들면 편리
cat > /tmp/ts-debug.sh << 'EOF'
#!/bin/bash
SESSION=$1

echo "=== TS Session Debug: $SESSION ==="
echo ""
echo "1. Session in list:"
ts list | grep "$SESSION" || echo "Not found"
echo ""
echo "2. Socket file:"
ls -la /home/jclee/.tmux/sockets/$SESSION 2>&1
echo ""
echo "3. tmux has-session:"
tmux -S /home/jclee/.tmux/sockets/$SESSION has-session -t $SESSION 2>&1 && echo "YES" || echo "NO"
echo ""
echo "4. Processes:"
ps aux | grep "tmux.*$SESSION" | grep -v grep
echo ""
echo "5. Database entry:"
sqlite3 /home/jclee/.config/ts/sessions.db "SELECT * FROM sessions WHERE name='$SESSION';" 2>&1
EOF

chmod +x /tmp/ts-debug.sh
/tmp/ts-debug.sh system
```

## 권장 사항

1. **세션 생성 후 즉시 `ts list`로 확인**
2. **Attach 실패 시 `ts sync` 실행**
3. **수동 attach 방법 숙지**: `ts attach <name>`
4. **Dead 세션은 주기적으로 정리**: `ts delete <dead-session>`
5. **중복 세션 발생 시 즉시 sync**: `ts sync`

## 참고 자료

- TS Master 소스: `/usr/local/bin/ts`
- TS Common Library: `/home/jclee/app/system/scripts/ts-common.sh`
- Session Database: `/home/jclee/.config/ts/sessions.db`
- Socket Directory: `/home/jclee/.tmux/sockets/`

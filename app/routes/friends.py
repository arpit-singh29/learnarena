# learnarena/app/routes/friends.py  (updated with notifications)

from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from app.database import get_db
from app.deps import get_current_user
from app.models import User
from app.schemas import FriendRequestCreate
from app.services import friend_service, notification_service

router = APIRouter(prefix="/friends", tags=["Friends"])


@router.get("/search")
def search_users(q: str, db: Session = Depends(get_db), user: User = Depends(get_current_user)):
    return friend_service.search_users(db, q, user.id)


@router.post("/request")
def send_request(data: FriendRequestCreate, db: Session = Depends(get_db), user: User = Depends(get_current_user)):
    if data.receiver_id == user.id:
        raise HTTPException(status_code=400, detail="Cannot add yourself")
    req = friend_service.send_request(db, user.id, data.receiver_id)

    # 🔔 Notify the receiver
    notification_service.create(
        db,
        user_id=data.receiver_id,
        type="friend_request",
        title="New friend request",
        message=f"{user.username} sent you a friend request",
        link="/friends",
    )
    return req


@router.get("/requests/incoming")
def incoming_requests(db: Session = Depends(get_db), user: User = Depends(get_current_user)):
    reqs = friend_service.get_pending_incoming(db, user.id)
    result = []
    for r in reqs:
        sender = db.query(User).filter(User.id == r.sender_id).first()
        result.append({
            "id":              r.id,
            "sender_id":       r.sender_id,
            "sender_username": sender.username if sender else "Unknown",
            "status":          r.status,
        })
    return result


@router.post("/request/{request_id}/accept")
def accept_request(request_id: int, db: Session = Depends(get_db), user: User = Depends(get_current_user)):
    req = friend_service.respond_request(db, request_id, user.id, accept=True)
    if not req:
        raise HTTPException(status_code=404, detail="Request not found")

    # 🔔 Notify the original sender
    notification_service.create(
        db,
        user_id=req.sender_id,
        type="friend_accepted",
        title="Friend request accepted",
        message=f"{user.username} accepted your friend request",
        link="/friends",
    )
    return {"message": "Friend request accepted"}


@router.post("/request/{request_id}/reject")
def reject_request(request_id: int, db: Session = Depends(get_db), user: User = Depends(get_current_user)):
    req = friend_service.respond_request(db, request_id, user.id, accept=False)
    if not req:
        raise HTTPException(status_code=404, detail="Request not found")
    return {"message": "Friend request rejected"}


@router.get("/list")
def list_friends(db: Session = Depends(get_db), user: User = Depends(get_current_user)):
    friends = friend_service.get_friends(db, user.id)
    return [{"id": f.id, "username": f.username} for f in friends]


@router.delete("/{friend_id}")
def remove_friend(friend_id: int, db: Session = Depends(get_db), user: User = Depends(get_current_user)):
    friend_service.remove_friend(db, user.id, friend_id)
    return {"message": "Friend removed"}

from sqlalchemy.orm import Session
from app.models import FriendRequest, User


def send_request(db: Session, sender_id: int, receiver_id: int):
    # Don't allow duplicate pending requests
    existing = db.query(FriendRequest).filter(
        FriendRequest.sender_id   == sender_id,
        FriendRequest.receiver_id == receiver_id,
        FriendRequest.status      == "pending"
    ).first()
    if existing:
        return existing

    req = FriendRequest(sender_id=sender_id, receiver_id=receiver_id)
    db.add(req)
    db.commit()
    db.refresh(req)
    return req


def respond_request(db: Session, request_id: int, user_id: int, accept: bool):
    req = db.query(FriendRequest).filter(
        FriendRequest.id          == request_id,
        FriendRequest.receiver_id == user_id,
        FriendRequest.status      == "pending"
    ).first()
    if not req:
        return None
    req.status = "accepted" if accept else "rejected"
    db.commit()
    db.refresh(req)
    return req


def get_friends(db: Session, user_id: int):
    """Return list of User objects who are accepted friends."""
    sent = db.query(FriendRequest).filter(
        FriendRequest.sender_id == user_id,
        FriendRequest.status    == "accepted"
    ).all()
    received = db.query(FriendRequest).filter(
        FriendRequest.receiver_id == user_id,
        FriendRequest.status      == "accepted"
    ).all()

    friend_ids = [r.receiver_id for r in sent] + [r.sender_id for r in received]
    return db.query(User).filter(User.id.in_(friend_ids)).all()


def get_pending_incoming(db: Session, user_id: int):
    return db.query(FriendRequest).filter(
        FriendRequest.receiver_id == user_id,
        FriendRequest.status      == "pending"
    ).all()


def search_users(db: Session, query: str, current_user_id: int):
    users = db.query(User).filter(
        User.username.ilike(f"%{query}%"),
        User.id != current_user_id
    ).limit(10).all()

    # Get all friend requests involving current user
    all_requests = db.query(FriendRequest).filter(
        (FriendRequest.sender_id == current_user_id) |
        (FriendRequest.receiver_id == current_user_id)
    ).all()

    # Build a map of other_user_id -> status
    status_map: dict = {}
    for r in all_requests:
        other_id = r.receiver_id if r.sender_id == current_user_id else r.sender_id
        # accepted beats pending beats rejected
        if status_map.get(other_id) != "accepted":
            status_map[other_id] = r.status

    result = []
    for u in users:
        result.append({
            "id":               u.id,
            "username":         u.username,
            "friend_status":    status_map.get(u.id, "none"),
            # none | pending | accepted | rejected
        })
    return result


def remove_friend(db: Session, user_id: int, friend_id: int):
    db.query(FriendRequest).filter(
        ((FriendRequest.sender_id == user_id) & (FriendRequest.receiver_id == friend_id)) |
        ((FriendRequest.sender_id == friend_id) & (FriendRequest.receiver_id == user_id))
    ).delete()
    db.commit()

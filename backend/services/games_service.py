from sqlalchemy.orm import Session
from backend.services.db_models import Game

# Sample game post data
SAMPLE_GAMES = [
    {
        "title": "Puzzle Master - Đỉnh cao của các tựa game trí tuệ",
        "category": "Puzzle",
        "description": "Khám phá thế giới của những câu đố hóc búa đầy tính logic.",
        "content": "Puzzle Master không chỉ đơn thuần là một trò chơi giải trí, mà là một phòng thí nghiệm rèn luyện trí não thực thụ. Với hơn 500 cấp độ từ cơ bản đến siêu việt, người chơi sẽ được thử thách tư duy đa chiều thông qua các câu đố sắp xếp không gian, giải mật mã và lắp ráp hình học. Hãy cùng điểm qua những mẹo cực hay để vượt qua cấp độ 100 đầy cam go nhé...",
        "image_url": "🎯",
        "views": 150,
        "likes": 45
    },
    {
        "title": "Speed Rush - Trải nghiệm tốc độ nghẹt thở",
        "category": "Action",
        "description": "Đua xe tốc độ cao với đồ họa 3D chân thực và âm thanh sống động.",
        "content": "Speed Rush mang lại cảm giác phấn khích tột độ trên các đường đua ngoằn ngoèo kỳ vĩ. Game sở hữu hệ thống vật lý va chạm chân thực, cho phép bạn thực hiện những pha drift kinh điển. Phiên bản cập nhật mới nhất còn bổ sung thêm tính năng độ xe chi tiết và các giải đấu PvP trực tuyến kịch tính toàn cầu.",
        "image_url": "⚡",
        "views": 280,
        "likes": 62
    },
    {
        "title": "Quiz Battle - Thử thách đấu trí kiến thức",
        "category": "Quiz",
        "description": "Đọ sức kiến thức tổng hợp với hàng ngàn người chơi trực tuyến.",
        "content": "Bạn tự tin vào vốn kiến thức phổ thông hay lịch sử của mình? Quiz Battle là đấu trường hoàn hảo để bạn chứng minh điều đó. Với kho tàng câu hỏi phong phú trải rộng ở mọi lĩnh vực, từ khoa học tự nhiên, văn học, cho đến văn hóa đại chúng, mỗi trận đấu là một cuộc đua nghẹt thở về thời gian và sự nhạy bén của trí óc.",
        "image_url": "🏆",
        "views": 320,
        "likes": 95
    },
    {
        "title": "Lucky Dice - Khi may mắn quyết định chiến thắng",
        "category": "Casual",
        "description": "Tựa game cờ tỷ phú kết hợp may rủi đầy hấp dẫn.",
        "content": "Lucky Dice mang đến những phút giây giải trí thư giãn nhẹ nhàng nhưng cũng không kém phần kịch tính. Trò chơi xoay quanh việc đổ xúc sắc để di chuyển trên bản đồ chứa đầy những sự kiện bất ngờ. Bạn sẽ trở thành tỷ phú sở hữu nhiều bất động sản hay bị phá sản chỉ sau một lượt gieo xúc xắc? Tất cả phụ thuộc vào độ may mắn của bạn!",
        "image_url": "🎲",
        "views": 200,
        "likes": 50
    },
    {
        "title": "Flappy Bird - Cơn sốt ức chế toàn cầu",
        "category": "Arcade",
        "description": "Tìm hiểu lý do vì sao chú chim nhỏ này lại gây nghiện đến vậy.",
        "content": "Hơn một thập kỷ trước, Flappy Bird của nhà phát triển Nguyễn Hà Đông đã tạo nên một cơn địa chấn toàn cầu. Với đồ họa pixel 8-bit cổ điển và lối chơi đơn giản chỉ bằng những cú chạm màn hình để giữ chú chim bay qua các đường ống nước, tựa game này đã khiến hàng triệu người chơi 'phát điên' vì độ khó cực kỳ ức chế nhưng vô cùng gây nghiện.",
        "image_url": "🌟",
        "views": 450,
        "likes": 120
    },
    {
        "title": "Candy Crush Saga - Bí quyết vượt qua hàng ngàn cấp độ",
        "category": "Puzzle",
        "description": "Hướng dẫn chi tiết các mẹo ghép kẹo ngọt đỉnh cao.",
        "content": "Candy Crush Saga là một trong những game xếp kẹo match-3 thành công nhất mọi thời đại. Dù đã ra mắt rất lâu, trò chơi vẫn thu hút hàng triệu game thủ mỗi ngày nhờ lối chơi rực rỡ và những màn giải đố thách thức. Bài viết này sẽ hướng dẫn bạn cách tạo ra các viên kẹo đặc biệt (striped, wrapped, color bomb) và kết hợp chúng để quét sạch bảng chơi hiệu quả nhất.",
        "image_url": "🎪",
        "views": 520,
        "likes": 150
    },
]


def init_games(db: Session):
    """Initialize sample game posts if database is empty"""
    existing_games = db.query(Game).count()
    if existing_games == 0:
        for game_data in SAMPLE_GAMES:
            game = Game(**game_data)
            db.add(game)
        db.commit()


def get_all_games(db: Session, limit: int = 100):
    """Get all game posts"""
    return db.query(Game).limit(limit).all()


def get_games_by_category(db: Session, category: str):
    """Get game posts by category"""
    return db.query(Game).filter(Game.category == category).all()


def get_game_by_id(db: Session, game_id: int):
    """Get game post by ID"""
    return db.query(Game).filter(Game.id == game_id).first()


def create_game(db: Session, title: str, category: str, description: str, content: str = None, image_url: str = None):
    """Create a new game post"""
    game = Game(title=title, category=category, description=description, content=content, image_url=image_url)
    db.add(game)
    db.commit()
    db.refresh(game)
    return game


def update_game_views(db: Session, game_id: int):
    """Increment game post views"""
    game = db.query(Game).filter(Game.id == game_id).first()
    if game:
        game.views += 1
        db.commit()
        db.refresh(game)
    return game


def update_game_likes(db: Session, game_id: int):
    """Increment game post likes"""
    game = db.query(Game).filter(Game.id == game_id).first()
    if game:
        game.likes += 1
        db.commit()
        db.refresh(game)
    return game


def get_popular_games(db: Session, limit: int = 4):
    """Get most popular game posts by likes"""
    return db.query(Game).order_by(Game.likes.desc()).limit(limit).all()


def get_new_games(db: Session, limit: int = 4):
    """Get newest game posts"""
    return db.query(Game).order_by(Game.created_at.desc()).limit(limit).all()

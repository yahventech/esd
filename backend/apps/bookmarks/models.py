from django.conf import settings
from django.db import models


class Bookmark(models.Model):
    user = models.ForeignKey(
        settings.AUTH_USER_MODEL, related_name="bookmarks", on_delete=models.CASCADE
    )
    story = models.ForeignKey(
        "stories.Story", related_name="bookmarks", on_delete=models.CASCADE
    )
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        unique_together = ("user", "story")
        ordering = ("-created_at",)

    def __str__(self):
        return f"{self.user} → {self.story}"

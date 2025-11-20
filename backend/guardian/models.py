from django.db import models
from django.conf import settings
from teacher.models import TeacherProfile

class Guardian(models.Model):
    teacher = models.ForeignKey(
        TeacherProfile, 
        on_delete=models.CASCADE, 
        related_name='guardians'
    )
    name = models.CharField(max_length=255)
    age = models.IntegerField()
    address = models.TextField(blank=True, null=True)
    relationship = models.CharField(max_length=100, blank=True, null=True)
    contact = models.CharField(max_length=50, blank=True, null=True)
    student_name = models.CharField(max_length=255)
    photo = models.ImageField(
        upload_to='guardian_photos/', 
        blank=True, 
        null=True,
        help_text='Guardian photo'
    )
    # Indicates whether this guardian has been authorized by a teacher
    is_authorized = models.BooleanField(default=False)
    timestamp = models.DateTimeField(auto_now_add=True)
    
    class Meta:
        ordering = ['-timestamp']
        verbose_name = 'Guardian'
        verbose_name_plural = 'Guardians'
    
    def __str__(self):
        return f"{self.name} - Guardian of {self.student_name}"
    
    def get_photo_url(self):
        """Get the full URL for the photo"""
        if self.photo:
            return self.photo.url
        return None


class GuardianApproval(models.Model):
    STATUS_ALLOWED = 'allowed'
    STATUS_DECLINED = 'declined'
    STATUS_CHOICES = [
        (STATUS_ALLOWED, 'Allowed'),
        (STATUS_DECLINED, 'Declined'),
    ]

    guardian = models.ForeignKey(
        Guardian,
        on_delete=models.CASCADE,
        related_name='approvals'
    )
    status = models.CharField(max_length=20, choices=STATUS_CHOICES)
    acted_by = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name='guardian_actions'
    )
    reason = models.TextField(blank=True, null=True)
    source = models.CharField(max_length=50, blank=True, null=True,
                              help_text='Source of action (mobile/admin)')
    timestamp = models.DateTimeField(auto_now_add=True)

    class Meta:
        ordering = ['-timestamp']
        verbose_name = 'Guardian Approval'
        verbose_name_plural = 'Guardian Approvals'

    def __str__(self):
        return f"{self.guardian} - {self.status} by {self.acted_by or 'system'}"
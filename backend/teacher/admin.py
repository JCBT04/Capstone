from django.contrib import admin
import logging

logger = logging.getLogger(__name__)
from .models import TeacherProfile, Attendance, UnauthorizedPerson

@admin.register(TeacherProfile)
class TeacherProfileAdmin(admin.ModelAdmin):
    list_display = ['user', 'section', 'age', 'gender', 'contact']
    search_fields = ['user__username', 'section']
    list_filter = ['gender', 'section']

@admin.register(Attendance)
class AttendanceAdmin(admin.ModelAdmin):
    list_display = ['student_name', 'guardian_name', 'teacher_username', 'date', 'status', 'transaction_type', 'session', 'gender', 'timestamp']
    search_fields = ['student_name', 'student_lrn', 'guardian_name', 'teacher__user__username']
    list_filter = ['status', 'transaction_type', 'date', 'session', 'gender', 'teacher']
    date_hierarchy = 'date'
    ordering = ['-date', '-timestamp']

    def teacher_username(self, obj):
        try:
            return obj.teacher.user.username if obj.teacher and getattr(obj.teacher, 'user', None) else '—'
        except Exception:
            return '—'
    teacher_username.short_description = 'Teacher'

    def get_queryset(self, request):
        """Defensive queryset: log exceptions and return empty queryset instead of raising 500."""
        try:
            qs = super().get_queryset(request)
            return qs
        except Exception as e:
            logger.exception('AttendanceAdmin.get_queryset failed')
            return self.model.objects.none()

@admin.register(UnauthorizedPerson)
class UnauthorizedPersonAdmin(admin.ModelAdmin):
    list_display = ['name', 'student_name', 'guardian_name', 'relation', 'contact', 'timestamp']
    search_fields = ['name', 'student_name', 'guardian_name', 'contact']
    list_filter = ['relation', 'timestamp']
    date_hierarchy = 'timestamp'
    ordering = ['-timestamp']
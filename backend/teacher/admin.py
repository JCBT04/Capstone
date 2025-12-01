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
    # Temporarily simplify admin display to avoid runtime errors while debugging
    list_display = ['id', 'date']
    search_fields = ['student_name', 'student_lrn']

    def get_queryset(self, request):
        """Return queryset defensively; log exceptions and return empty queryset on error."""
        try:
            return super().get_queryset(request)
        except Exception:
            logger.exception('AttendanceAdmin.get_queryset failed')
            return self.model.objects.none()

@admin.register(UnauthorizedPerson)
class UnauthorizedPersonAdmin(admin.ModelAdmin):
    list_display = ['name', 'student_name', 'guardian_name', 'relation', 'contact', 'timestamp']
    search_fields = ['name', 'student_name', 'guardian_name', 'contact']
    list_filter = ['relation', 'timestamp']
    date_hierarchy = 'timestamp'
    ordering = ['-timestamp']
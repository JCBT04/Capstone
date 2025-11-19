from django.urls import path
from .views import (
    AuthenticatedStudentRegistrationView,
    PublicStudentRegistrationView,
    TeacherStudentsView,
    StudentListView,
    ParentGuardianListView,
    ParentGuardianPublicListView,
    StudentDetailView,
    AllTeachersStudentsView,
    ParentLoginView,
    ParentDetailView,
    ParentNotificationListCreateView,
    ParentEventListCreateView,
    ParentScheduleListCreateView,
)

urlpatterns = [
    path('register/', AuthenticatedStudentRegistrationView.as_view(), name='register'),
    path('public/register/', PublicStudentRegistrationView.as_view(), name='public-register'),
    path('teacher-students/', TeacherStudentsView.as_view(), name='teacher-students'),
    path('students/', StudentListView.as_view(), name='students-list'),
    path('parents/', ParentGuardianListView.as_view(), name='parents-list'),
    path('parents/public/', ParentGuardianPublicListView.as_view(), name='parents-public-list'),
    path('students/<str:lrn>/', StudentDetailView.as_view(), name='student-detail'),
    path('all-teachers-students/', AllTeachersStudentsView.as_view(), name='all-teachers-students'),
     #new
    path('login/', ParentLoginView.as_view(), name='parent-login'),
    path('parents/<int:pk>/', ParentDetailView.as_view(), name='parent-detail'),
    path('notifications/', ParentNotificationListCreateView.as_view(), name='parent-notifications'),
    path('events/', ParentEventListCreateView.as_view(), name='parent-events'),
    path('schedules/', ParentScheduleListCreateView.as_view(), name='parent-schedules'),
]
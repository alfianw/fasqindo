package response

import "github.com/gin-gonic/gin"

const CodeSuccess = "00"

func JSON(c *gin.Context, status int, code, message string, data any) {
	c.AbortWithStatusJSON(status, gin.H{
		"code":    code,
		"message": message,
		"data":    data,
	})
}

func Success(c *gin.Context, message string, data any) {
	JSON(c, 200, CodeSuccess, message, data)
}

func Created(c *gin.Context, message string, data any) {
	JSON(c, 201, CodeSuccess, message, data)
}
